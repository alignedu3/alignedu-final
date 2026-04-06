export const handleBookDemo = () => {
  const email = 'ryan@alignedu.net';
  const subject = encodeURIComponent('Book a Demo');
  const body = encodeURIComponent(`
    Hi,

    I would like to schedule a call to learn more about the services you provide and discuss how your solutions can help my campus or district achieve its goals. I’m interested in exploring how we can work together to improve outcomes and streamline processes.

    Looking forward to your response.

    Best regards,
    [Your Name]
  `);

  window.open(`mailto:${email}?subject=${subject}&body=${body}`);
};
