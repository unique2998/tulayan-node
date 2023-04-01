const mysql = require('mysql2');

module.exports = mysql.createPool({
    host: '127.0.0.1',
    user: 'admin',
    password: '1-2-3-4',
    database: 'tulayan_dormitory'
});


