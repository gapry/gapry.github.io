import fs from 'fs';
import path from 'path';

const postsDir = './public/posts';
const distDir = './dist';
const allPosts = [];
const years = fs.readdirSync(postsDir);

years.forEach(year => {
  const yearPath = path.join(postsDir, year);
  if (fs.lstatSync(yearPath).isDirectory()) {
    const files = fs.readdirSync(yearPath);
    files.forEach(file => {
      if (file.endsWith('.md')) {
        const fileName = file.replace('.md', '');
        const parts = fileName.split('-');

        const y = parts[0];
        const m = parts[1];
        const d = parts[2];
        const slug = parts.slice(3).join('-');

        allPosts.push({
          year: y,
          month: m,
          day: d,
          slug,
          originalName: fileName,
          title: slug.replace(/-/g, ' '),
          date: `${y}-${m}-${d}`
        });
      }
    });
  }
});

allPosts.sort((a, b) => b.date.localeCompare(a.date));

const postsData = JSON.stringify(allPosts, null, 2);
fs.writeFileSync('./public/posts.json', postsData);

if (fs.existsSync(path.join(distDir, 'index.html'))) {
  fs.writeFileSync(path.join(distDir, 'posts.json'), postsData);

  allPosts.forEach(post => {
    const targetDir = path.join(distDir, post.year, post.month, post.day);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.copyFileSync(
      path.join(distDir, 'index.html'),
      path.join(targetDir, `${post.slug}.html`)
    );
  });

  fs.copyFileSync(
    path.join(distDir, 'index.html'),
    path.join(distDir, '404.html')
  );
}

console.log(`✅ Build ${allPosts.length} Posts Successfully`);
