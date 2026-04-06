const fs = require('fs');
let content = fs.readFileSync('page.tsx', 'utf8');
const old = `        <button onClick={() => {console.log("Demo Button Clicked!"); router.push("/analyze");}} className="demo-button" style={primaryBtn} onClick={() => {console.log("Demo Button Clicked!"); router.push("/analyze");}} className="demo-button" style={primaryBtn} onClick={() => router.push('/analyze')} style={primaryBtn}>
          Try It Now
        </button>`;
const newCode = `        <button onClick={() => { window.location.href = 'mailto:ryan@alignedu.net?subject=AlignEDU Demo Request&body=Hello, I would like to book a demo for AlignEDU.'; }} style={primaryBtn}>
          Book Demo
        </button>`;
fs.writeFileSync('page.tsx', content.replace(old, newCode));
