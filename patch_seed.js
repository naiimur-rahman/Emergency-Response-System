const fs = require('fs');
let seed = fs.readFileSync('database/seed.sql', 'utf8');

const nameGenerationSql = `    (ARRAY[
        'Rahim Uddin', 'Karim Mia', 'Zahirul Islam', 'Sabbir Ahmed', 'Farhan Chowdhury',
        'Nabila Akter', 'Rokeya Begum', 'Anika Khatun', 'Salma Rahman', 'Nusrat Jahan',
        'Lutfur Rahman', 'Jasim Ahmed', 'Sumon Mia', 'Tanjina Akter', 'Fatima Begum',
        'Abid Hasan', 'Sharif Islam', 'Ayesha Siddiqua', 'Khadija Akter', 'Shohel Rana',
        'Sumaiya Tabassum', 'Sadia Afrin', 'Imran Hossain', 'Tariq Ali', 'Farhana Akter'
    ])[floor(random() * 25) + 1]`;

seed = seed.replace(/'Patient ' \|\| i/g, nameGenerationSql);
fs.writeFileSync('database/seed.sql', seed);
console.log('Patched seed.sql');
