const fs = require('fs');
let content = fs.readFileSync('page.tsx', 'utf8');
const old = `          <button onClick={() => {console.log("Demo Button Clicked!"); router.push("/analyze");}} className="demo-button" style={primaryBtn} onClick={() => {console.log("Demo Button Clicked!"); router.push("/analyze");}} className="demo-button" style={primaryBtn} onClick={() => router.push('/analyze')} style={primaryBtn}>
            Try It Now
          </button>

          <button onClick={() => {console.log("Demo Button Clicked!"); router.push("/analyze");}} className="demo-button" style={primaryBtn} onClick={() => {console.log("Demo Button Clicked!"); router.push("/analyze");}} className="demo-button" style={primaryBtn}
            onClick={() =>
              window.location.href =
                'mailto:ryan@alignedu.net?subject=AlignEDU Demo Request&body=Hello,%0A%0AI would like to request a demo of AlignEDU.%0A%0ASchool/District:%0ARole:%0A%0AAdditional Details:%0A'
            }
            style={{ ...secondaryBtn, fontWeight: "bold" }}
          >
            Book Demo
          </button>`;
const newCode = `          <button onClick={() => { router.push("/analyze"); }} className="demo-button" style={primaryBtn}>
            Try It Now
          </button>

          <button onClick={() => { window.location.href = 'mailto:ryan@alignedu.net?subject=AlignEDU Demo Request&body=Hello, I would like to book a demo for AlignEDU.'; }} style={{ ...secondaryBtn, fontWeight: "bold" }}>
            Book Demo
          </button>`;
fs.writeFileSync('page.tsx', content.replace(old, newCode));
