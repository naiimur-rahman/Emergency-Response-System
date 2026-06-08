const fs = require('fs');
let seed = fs.readFileSync('database/seed.sql', 'utf8');

const maleDriverSql = `    (ARRAY[
        'Rahim Uddin', 'Karim Mia', 'Zahirul Islam', 'Sabbir Ahmed', 'Farhan Chowdhury',
        'Lutfur Rahman', 'Jasim Ahmed', 'Sumon Mia', 'Abid Hasan', 'Sharif Islam',
        'Shohel Rana', 'Mustafizur Rahman', 'Imran Hossain', 'Tariq Ali', 'Jamal Uddin',
        'Kamal Hossain', 'Asif Ahmed', 'Shafiqul Islam', 'Arif Hossain', 'Mahbub Alam'
    ])[floor(random() * 20) + 1]`;

seed = seed.replace(/'Driver ' \|\| i/g, maleDriverSql);
seed = seed.replace(/'Mim Chowdhury'/g, "'Milon Chowdhury'");
seed = seed.replace(/'Nabila Islam'/g, "'Naimul Islam'");

fs.writeFileSync('database/seed.sql', seed);
console.log('Patched driver seed');
