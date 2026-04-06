const fs = require('fs');
let content = fs.readFileSync('/Users/ryan/alignedu-final/app/layout.tsx', 'utf8');
const old = `{/* BOOK DEMO BUTTON */}
          <button
            onClick={() =>
              window.location.href =
                'mailto:ryan@alignedu.net?subject=AlignEDU Demo Request&body=Hello,%0A%0AI would like to request a demo of AlignEDU.%0A%0ASchool/District:%0ARole:%0A%0AAdditional Details:%0A'
            }
            style={{
              backgroundColor: '#facc15',
              color: '#1e293b',
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold'
            }}
          >
            Book Demo
          </button>`;
const newCode = `{/* LOGIN BUTTON */}
          <button
            onClick={() => { window.location.href = '/login'; }}
            style={{
              backgroundColor: '#facc15',
              color: '#1e293b',
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Login
          </button>`;
fs.writeFileSync('/Users/ryan/alignedu-final/app/layout.tsx', content.replace(old, newCode));
