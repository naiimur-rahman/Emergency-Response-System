const fs = require('fs');

const maleFirstNames = ['Rahim', 'Karim', 'Zahirul', 'Sabbir', 'Farhan', 'Lutfur', 'Jasim', 'Sumon', 'Abid', 'Sharif', 'Shohel', 'Mustafizur', 'Imran', 'Tariq', 'Jamal', 'Kamal', 'Asif', 'Shafiq', 'Arif', 'Sohel', 'Mahbub', 'Rony', 'Hasan', 'Hossain', 'Ali', 'Rakib', 'Sakib', 'Faisal', 'Mehedi', 'Naim', 'Shuvo', 'Tushar', 'Rubel', 'Milon', 'Manik', 'Bappi', 'Kazi', 'Riaz', 'Amin', 'Momin', 'Jafar', 'Nayeem', 'Shapon', 'Khokon', 'Liton', 'Ripon', 'Jewel', 'Masud', 'Mamun', 'Mizan', 'Shahid', 'Zia', 'Enamul', 'Habib', 'Rashed', 'Rafi'];
const femaleFirstNames = ['Nabila', 'Rokeya', 'Momena', 'Anika', 'Salma', 'Nusrat', 'Tanjina', 'Fatima', 'Ayesha', 'Khadija', 'Sumaiya', 'Sadia', 'Farhana', 'Tasnim', 'Jannatul', 'Mim', 'Riya', 'Purnima', 'Sadiya', 'Ritu', 'Bristy', 'Kona', 'Munmun', 'Shila', 'Liza', 'Sonia', 'Jui', 'Nipa', 'Tania', 'Poly', 'Shirin', 'Nasrin', 'Fahmida', 'Nahid', 'Afroza'];
const lastNames = ['Uddin', 'Mia', 'Islam', 'Chowdhury', 'Ahmed', 'Kabir', 'Hasan', 'Rahman', 'Khatun', 'Begum', 'Akter', 'Khan', 'Rana', 'Tabassum', 'Hossain', 'Ali', 'Sikder', 'Molla', 'Talukder', 'Bhuiyan', 'Saha', 'Das', 'Roy', 'Majumder', 'Dewan', 'Mirza'];

function getRandomName(isMale) {
    const first = isMale 
        ? maleFirstNames[Math.floor(Math.random() * maleFirstNames.length)]
        : femaleFirstNames[Math.floor(Math.random() * femaleFirstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    // Make sure 'Begum' or 'Akter' or 'Khatun' or 'Tabassum' are only for females, 
    // but honestly we can just use the arrays.
    let finalLast = last;
    if (isMale && ['Khatun', 'Begum', 'Akter', 'Tabassum'].includes(finalLast)) {
        finalLast = 'Rahman';
    }
    if (!isMale && ['Uddin', 'Mia'].includes(finalLast)) {
        finalLast = 'Akter';
    }
    return first + ' ' + finalLast;
}

let sql = '';

// Generate updates for Drivers (Male only)
for (let i = 1; i <= 60; i++) {
    const name = getRandomName(true).replace(/'/g, "''");
    sql += `UPDATE Drivers SET Name = '${name}' WHERE Driver_ID = ${i};\n`;
}

// Generate updates for Patients (Mixed)
for (let i = 1; i <= 510; i++) {
    const isMale = Math.random() > 0.5;
    const name = getRandomName(isMale).replace(/'/g, "''");
    sql += `UPDATE Patients SET Name = '${name}' WHERE Patient_ID = ${i};\n`;
}

fs.writeFileSync('update_names.sql', sql);
console.log('update_names.sql generated');
