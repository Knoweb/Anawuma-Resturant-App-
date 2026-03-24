const fs = require('fs');
const path = require('path');

function replaceInDir(directory) {
    const files = fs.readdirSync(directory);

    files.forEach(file => {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            replaceInDir(filePath);
        } else if (file.endsWith('.css') || file.endsWith('.js') || file.endsWith('.jsx')) {
            let content = fs.readFileSync(filePath, 'utf8');

            const replacements = [
                { old: /#667eea/gi, new: '#266668' },
                { old: /#764ba2/gi, new: '#1a4648' },
                { old: /#2D7C7E/gi, new: '#266668' },
                { old: /#235D5F/gi, new: '#1a4648' },
                { old: /#2575fc/gi, new: '#266668' }, // Indigo/Blue from gradients
                { old: /#6a11cb/gi, new: '#1a4648' }, // Purple from gradients
                { old: /#6f42c1/gi, new: '#266668' }  // Standard Purple
            ];

            let modified = false;
            replacements.forEach(r => {
                if (r.old.test(content)) {
                    content = content.replace(r.old, r.new);
                    modified = true;
                }
            });

            if (modified) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Updated: ${filePath}`);
            }
        }
    });
}

replaceInDir('./src');
console.log('Done.');
