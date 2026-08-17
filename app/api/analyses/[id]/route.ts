import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getAdminVisibility } from '@/lib/adminVisibility';
import { normalizeStructuredReportText, parseAnalysisMetrics } from '@/lib/analysisReport';
import { calculateLessonScoreFromMetrics } from '@/lib/dashboardData';
import { getErrorMessage } from '@/lib/errorHandling';
import { DALLAS_ISD_OBSERVATION_INDICATORS, DALLAS_ISD_RUBRIC_ID } from '@/lib/evaluationRubrics';

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeMetricValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function normalizeGapValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
}

function buildMetricsBlock(metrics: {
  score: number;
  coverage: number;
  clarity: number;
  engagement: number;
  assessment: number;
  gaps: number;
}) {
  return [
    'Metrics:',
    `Instructional Score (0-100): ${metrics.score}`,
    `Coverage (0-100): ${metrics.coverage}`,
    `Clarity (0-100): ${metrics.clarity}`,
    `Engagement (0-100): ${metrics.engagement}`,
    `Assessment Quality (0-100): ${metrics.assessment}`,
    `Gaps Flagged: ${metrics.gaps}`,
  ].join('\n');
}

function upsertMetricsBlock(text: string, metrics: {
  score: number;
  coverage: number;
  clarity: number;
  engagement: number;
  assessment: number;
  gaps: number;
}) {
  const normalized = normalizeStructuredReportText(text || '');
  const withoutExistingMetrics = normalized.replace(/^Metrics:\s*[\s\S]*?(?=\n===|\n[A-Z][A-Za-z\s]+:|$)/i, '').trimStart();
  return normalizeStructuredReportText(`${buildMetricsBlock(metrics)}\n\n${withoutExistingMetrics}`.trim());
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const serverSupabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await serverSupabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
    }

    const { data: profile, error: profileError } = await serverSupabase
      .from('profiles')
      .select('id, name, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
    }

    const serviceSupabase = getServiceSupabase();
    const { data: analysis, error: analysisError } = await serviceSupabase
      .from('analyses')
      .select('*')
      .eq('id', id)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json(
        { success: false, error: analysisError?.message || 'Analysis not found' },
        { status: 404 }
      );
    }

    const isOwner = analysis.user_id === user.id;
    const isAdminCaller = ['admin', 'super_admin'].includes(profile?.role);
    let canAdminManage = false;

    if (isAdminCaller) {
      if (isOwner) {
        canAdminManage = true;
      } else {
        const visibility = await getAdminVisibility(user.id, profile.role);
        canAdminManage = visibility.visibleUserIds.includes(analysis.user_id);
      }
    }

    const teacherFeedbackRequested = Object.prototype.hasOwnProperty.call(body, 'teacherFeedback');
    const teacherRatingRequested = Object.prototype.hasOwnProperty.call(body, 'teacherFeedbackRating');
    const adminFeedbackRequested = Object.prototype.hasOwnProperty.call(body, 'adminFeedback');
    const adminRatingRequested = Object.prototype.hasOwnProperty.call(body, 'adminFeedbackRating');
    const editedResultRequested = Object.prototype.hasOwnProperty.call(body, 'editedResult');
    const metricOverridesRequested = Object.prototype.hasOwnProperty.call(body, 'metricOverrides');
    const rubricReviewRequested = Object.prototype.hasOwnProperty.call(body, 'rubricReview');

    const updates: Record<string, unknown> = {};
    const now = new Date().toISOString();

    if (teacherFeedbackRequested || teacherRatingRequested) {
      if (!isOwner) {
        return NextResponse.json({ success: false, error: 'Only the teacher can update teacher feedback.' }, { status: 403 });
      }

      if (teacherFeedbackRequested) updates.teacher_feedback = normalizeOptionalText(body.teacherFeedback);
      if (teacherRatingRequested) {
        const rating = Number(body.teacherFeedbackRating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          return NextResponse.json({ success: false, error: 'Teacher usefulness rating must be from 1 to 5.' }, { status: 400 });
        }
        updates.teacher_feedback_rating = rating;
      }
      updates.teacher_feedback_updated_at = now;
    }

    if (adminFeedbackRequested || adminRatingRequested || editedResultRequested || metricOverridesRequested || rubricReviewRequested) {
      if (!canAdminManage) {
        return NextResponse.json({ success: false, error: 'Only an administrator in scope can update administrator notes or edits.' }, { status: 403 });
      }

      if (adminFeedbackRequested) {
        updates.admin_feedback = normalizeOptionalText(body.adminFeedback);
        updates.admin_feedback_updated_at = now;
        updates.admin_feedback_author_name = profile?.name || 'Administrator';
      }
      if (adminRatingRequested) {
        const rating = Number(body.adminFeedbackRating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          return NextResponse.json({ success: false, error: 'Administrator usefulness rating must be from 1 to 5.' }, { status: 400 });
        }
        updates.admin_feedback_rating = rating;
        updates.admin_feedback_updated_at = now;
        updates.admin_feedback_author_name = profile?.name || 'Administrator';
      }

      if (rubricReviewRequested) {
        if (profile?.role !== 'super_admin') {
          return NextResponse.json({ success: false, error: 'The rubric pilot is currently limited to the super administrator.' }, { status: 403 });
        }
        if (analysis.rubric_id !== DALLAS_ISD_RUBRIC_ID || !Array.isArray(body.rubricReview)) {
          return NextResponse.json({ success: false, error: 'This lesson does not have a supported rubric review.' }, { status: 400 });
        }

        const allowedIndicators = new Set(DALLAS_ISD_OBSERVATION_INDICATORS.map((item) => item.indicator));
        const normalizedReview = body.rubricReview
          .filter((item: unknown) => item && typeof item === 'object')
          .map((item: Record<string, unknown>) => ({
            indicator: String(item.indicator || ''),
            title: String(item.title || '').slice(0, 100),
            rating: [-1, 0, 1, 2, 3].includes(Number(item.rating)) ? Number(item.rating) : -1,
            confirmedRating: [-1, 0, 1, 2, 3].includes(Number(item.confirmedRating)) ? Number(item.confirmedRating) : -1,
            evidence: String(item.evidence || '').slice(0, 2000),
            administratorNote: String(item.administratorNote || '').trim().slice(0, 2000),
          }))
          .filter((item: { indicator: string }) => allowedIndicators.has(item.indicator));

        if (normalizedReview.length !== DALLAS_ISD_OBSERVATION_INDICATORS.length) {
          return NextResponse.json({ success: false, error: 'Rubric review must include all seven observation indicators.' }, { status: 400 });
        }
        updates.rubric_review = normalizedReview;
      }

      if (editedResultRequested) {
        updates.admin_edited_result = normalizeOptionalText(body.editedResult);
        updates.admin_edited_result_updated_at = now;
        updates.admin_edited_result_editor_name = profile?.name || 'Administrator';
      }

      if (editedResultRequested || metricOverridesRequested) {
        const currentNarrative = normalizeOptionalText(
          typeof updates.admin_edited_result === 'string'
            ? updates.admin_edited_result
            : analysis.admin_edited_result || analysis.result || analysis.analysis_result || ''
        ) || '';
        const parsedMetrics = parseAnalysisMetrics(currentNarrative);
        const overrideSource =
          body.metricOverrides && typeof body.metricOverrides === 'object' ? body.metricOverrides as Record<string, unknown> : {};

        const coverage = normalizeMetricValue(overrideSource.coverage, parsedMetrics.coverage ?? Number(analysis.coverage_score || 75));
        const clarity = normalizeMetricValue(overrideSource.clarity, parsedMetrics.clarity ?? Number(analysis.clarity_rating || 75));
        const engagement = normalizeMetricValue(overrideSource.engagement, parsedMetrics.engagement ?? Number(analysis.engagement_level || 75));
        const assessment = normalizeMetricValue(overrideSource.assessment, parsedMetrics.assessment ?? Number(analysis.assessment_quality || 75));
        const gaps = normalizeGapValue(overrideSource.gaps, parsedMetrics.gaps ?? Number(analysis.gaps_detected || 0));
        const score = calculateLessonScoreFromMetrics({
          coverage,
          clarity,
          engagement,
          assessment,
          gaps,
        });

        updates.coverage_score = coverage;
        updates.clarity_rating = clarity;
        updates.engagement_level = engagement;
        updates.assessment_quality = assessment;
        updates.gaps_detected = gaps;
        updates.admin_edited_result = upsertMetricsBlock(currentNarrative, {
          score,
          coverage,
          clarity,
          engagement,
          assessment,
          gaps,
        });
        updates.admin_edited_result_updated_at = now;
        updates.admin_edited_result_editor_name = profile?.name || 'Administrator';
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid changes were provided.' }, { status: 400 });
    }

    const { data: updatedAnalysis, error: updateError } = await serviceSupabase
      .from('analyses')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, analysis: updatedAnalysis });
  } catch (error) {
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const serverSupabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await serverSupabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await serverSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
    }

    const serviceSupabase = getServiceSupabase();

    const { data: analysis, error: analysisError } = await serviceSupabase
      .from('analyses')
      .select('user_id')
      .eq('id', id)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json(
        { success: false, error: analysisError?.message || 'Analysis not found' },
        { status: 404 }
      );
    }

    const isOwner = analysis.user_id === user.id;
    let canDelete = isOwner;

    if (['admin', 'super_admin'].includes(profile?.role) && !canDelete) {
      const visibility = await getAdminVisibility(user.id, profile.role);
      canDelete = visibility.visibleUserIds.includes(analysis.user_id);
    }

    if (!canDelete) {
      return NextResponse.json({ success: false, error: 'Not authorized to delete this lesson' }, { status: 403 });
    }

    const { error: deleteError } = await serviceSupabase
      .from('analyses')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
