import fs from 'fs';
import path from 'path';

const postsDir = './public/posts';
const distDir  = './dist';
const allPosts = [];
const years    = fs.readdirSync(postsDir);

years.forEach(year => {
  const yearPath = path.join(postsDir, year);

  if (fs.lstatSync(yearPath).isDirectory()) {
    const files = fs.readdirSync(yearPath);

    files.forEach(file => {
      if (file.endsWith('.md')) {
        const filePath = path.join(yearPath, file);
        const content  = fs.readFileSync(filePath, 'utf8');

        const tagsMatch = content.match(/^tags:\s*(.*)$/m);

        let tags = [];
        if (tagsMatch) {
          tags = tagsMatch[1]
            .split(',')
            .map(t => t.trim())
            .filter(Boolean); 
        }

        const fileName = file.replace('.md', '');
        const parts    = fileName.split('-');

        const y    = parts[0];
        const m    = parts[1];
        const d    = parts[2];
        const slug = parts.slice(3).join('-');

        allPosts.push({
          year         : y,
          month        : m,
          day          : d,
          slug,
          tags,
          originalName : fileName,
          title        : slug.replace(/-/g, ' '),
          date         : `${y}-${m}-${d}`
        });
      }
    });
  }
});

allPosts.sort((a, b) => {
  const dateCompare = b.date.localeCompare(a.date);

  if (dateCompare === 0) {
    return b.originalName.localeCompare(a.originalName);
  }
  return dateCompare;
});

const postsData = JSON.stringify(allPosts, null, 2);
fs.writeFileSync('./public/posts.json', postsData);

if (fs.existsSync(path.join(distDir, 'index.html'))) {
  fs.writeFileSync(path.join(distDir, 'posts.json'), postsData);

  allPosts.forEach(post => {
    const targetDir = path.join(distDir, post.year, post.month, post.day);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, {
        recursive: true
      });
    }

    fs.copyFileSync(
      path.join(distDir  , 'index.html'),
      path.join(targetDir, `${post.slug}.html`)
    );
  });

  const allTags = [...new Set(allPosts.flatMap(p => p.tags))];
  
  allTags.forEach(tag => {
    const tagDir = path.join(distDir, 'tag', tag);

    if (!fs.existsSync(tagDir)) {
      fs.mkdirSync(tagDir, { 
        recursive: true 
      });
    }
    
    fs.copyFileSync(
      path.join(distDir, 'index.html'), 
      path.join(tagDir, 'index.html')
    );
  });

  const tagsPageDir = path.join(distDir, 'tags');
  if (!fs.existsSync(tagsPageDir)) {
    fs.mkdirSync(tagsPageDir, { recursive: true });
  }
  fs.copyFileSync(
    path.join(distDir, 'index.html'),
    path.join(tagsPageDir, 'index.html') 
  );

  const PagesComponents = ['404.html', 'about.html', 'tags.html']; 
  PagesComponents.forEach(page => {
    fs.copyFileSync(
      path.join(distDir, 'index.html'),
      path.join(distDir, page)
    );
  });
}

console.log(`✅ Build ${allPosts.length} Posts Successfully`);
