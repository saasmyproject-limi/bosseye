const fs = require('fs');
const content = fs.readFileSync('src/app/commun/mouvements/page.tsx', 'utf8');

const lines = content.split('\n');
let depth = 0;
let stack = [];

lines.forEach((line, idx) => {
  const lineNum = idx + 1;
  // Match <div or </div> or <AppLayout or </AppLayout>
  const tags = line.match(/<\/?([a-zA-Z0-9]+)(\s|>|\/)/g) || [];
  tags.forEach(tag => {
    if (tag.startsWith('</')) {
      const tagName = tag.replace('</', '').replace('>', '').trim();
      const last = stack.pop();
      if (!last || last.tagName !== tagName) {
        console.log(`Line ${lineNum}: Mismatch closing </${tagName}>, expected </${last?.tagName}> (opened line ${last?.lineNum})`);
      }
    } else if (!tag.endsWith('/>')) {
      const tagName = tag.replace('<', '').replace('>', '').replace('/', '').trim();
      if (['div', 'form', 'AppLayout', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'button', 'select', 'textarea', 'input'].includes(tagName)) {
        // Check if self closing in line
        const selfClosing = line.includes(`<${tagName}`) && line.includes('/>');
        if (!selfClosing) {
          stack.push({ tagName, lineNum });
        }
      }
    }
  });
});

console.log('Unclosed stack:', stack);
