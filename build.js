import fs from 'fs';
import path from 'path';

const postsDir = './public/posts';
const distDir = './dist';

const years = fs.readdirSync(postsDir);

years.forEach(year => {
  const yearPath = path.join(postsDir, year);
  if (fs.lstatSync(yearPath).isDirectory()) {
    const files = fs.readdirSync(yearPath);
    files.forEach(file => {
      if (file.endsWith('.md')) {
        const slug      = file.replace('.md', '');
        const targetDir = path.join(distDir, year);
        
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { 
            recursive: true 
          });
        }
        fs.copyFileSync(path.join(distDir, 'index.html'), path.join(targetDir, `${slug}.html`));
      }
    });
  }
});

fs.copyFileSync(
  path.join(distDir, 'index.html'), 
  path.join(distDir, '404.html')
);

console.log('✅ Build HTML from Markdown Post');