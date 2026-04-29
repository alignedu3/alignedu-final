import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getAdminVisibility } from "@/lib/adminVisibility";
import { getErrorMessage } from "@/lib/errorHandling";

export async function GET(
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
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await serverSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: job, error: jobError } = await serviceSupabase
      .from("analysis_jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: jobError?.message || "Analysis job not found" },
        { status: 404 }
      );
    }

    const isOwner = job.submitted_by_user_id === user.id || job.target_user_id === user.id;
    let canView = isOwner;

    if (!canView && (profile?.role === "admin" || profile?.role === "super_admin")) {
      const visibility = await getAdminVisibility(user.id, profile.role);
      canView =
        visibility.visibleUserIds.includes(job.target_user_id) ||
        visibility.teacherIds.includes(job.target_user_id) ||
        job.submitted_by_user_id === user.id;
    }

    if (!canView) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        progressStep: job.progress_step,
        progressPercent: job.progress_percent,
        error: job.error,
        result: job.result,
        transcript: job.transcript,
        analysisId: job.analysis_id,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        metrics: {
          score: job.score,
          coverage: job.coverage_score,
          clarity: job.clarity_rating,
          engagement: job.engagement_level,
          assessment: job.assessment_quality,
          gaps: job.gaps_detected,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
