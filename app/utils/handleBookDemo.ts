export const handleBookDemo = () => {
  const email = 'ryan@alignedu.net';
  const subject = encodeURIComponent('AlignEDU Demo – Instructional Insight Platform');

  const body = encodeURIComponent(
`Hi,

I’d like to schedule a demo of AlignEDU to learn more about how it can support instructional visibility and curriculum alignment at my campus/district.

Please let me know your availability.

Best regards,
[Your Name]
[School/District]`
  );

  window.open(`mailto:${email}?subject=${subject}&body=${body}`);
};
