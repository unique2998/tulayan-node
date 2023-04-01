const express = require('express');
const db = require('./database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const app = express();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
    
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext)
    }
  });

const upload = multer({storage: storage})

app.use(express.json());

app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

//Tenants

app.post('/api/tenants', async (req, res) => {
    try{
        const {unit_id, user_id} = req.body;
        const [results] = await db.promise().query(`
        INSERT INTO tenants(unit_id, user_id) VALUES
        (?,?)`,[unit_id, user_id]);
        
        
        res.send(results);
    }
    catch(err){
        console.log(err);
    }
});

app.get('/api/tenants', async (req, res) => {
    try{
        const [results] = await db.promise().query("SELECT tenants.id, users.last_name, users.first_name, users.contact, users.email, tenants.unit_id, units.desc, users.photo, users.address, DATE_FORMAT(users.birth_date,'%M %d, %Y') as birth_date, occupations. description as occupation FROM tenants JOIN units ON units.id = tenants.unit_id join users on users.id = tenants.user_id left join occupations on occupations.id = users.occupation");
        res.send(results);
    }
    catch(err){
        console.log(err);
    }
});

app.get('/api/tenants/:id', async (req, res) => {
    try{
        const[[row]] = await db.promise().query(`SELECT tenants.id, users.last_name, users.first_name, users.contact, users.email, tenants.unit_id, units.desc FROM tenants JOIN units ON units.id = tenants.unit_id join users on users.id = tenants.user_id WHERE tenants.id = ?`,[req.params.id]);
        if(!row) return res.status(404).send('The tenant with the given ID was not found.');
        res.send(row);
    }
    catch(err){
        console.log(err);
    }
});

app.put('/api/tenants/:id', async (req, res) => {
    try{
        const {unit_id, user_id} = req.body;
        const [{affectedRows}] = await db.promise().query(`
        UPDATE tenants
        SET
        unit_id= ?, 
        user_id = ?

        WHERE id = ?
        `,[unit_id, user_id, req.params.id]);
        if(!affectedRows) return res.status(404).send('The tenant with the given ID was not found.');
        res.send('Successfully Updated');
    }
    catch(err){
        console.log(err);
    }
});

app.delete('/api/tenants/:id', async(req, res) => {
    try{  
        const [{affectedRows}] = await db.promise().query(`DELETE FROM tenants WHERE id = ?`,[req.params.id]);
        if(!affectedRows) return res.status(404).send('The tenant with the given ID was not found.');
        res.send({ message: "Successfully Deleted" });
    }
    catch(err){
        console.log(err);
    }
});


//Units

app.post('/api/units', async (req, res) => {
    try{
        const {desc, image} = req.body;
        const [results] = await db.promise().query(`
        INSERT INTO units(\`desc\`, image) VALUES
        (?,?)`,[desc, image]);
        res.send(results);
    }
    catch(err){
        console.log(err);
    }
});

app.get('/api/units', async (req, res) => {
    try{
        const [results] = await db.promise().query("SELECT * FROM units");
        res.send(results);
    }
    catch(err){
        console.log(err);
    }
});

app.post('/api/units-available', async (req, res) => {
    try{

        const {token} = req.body;
        jwt.verify(token, 'privKey=sTThw342', async function(err, decoded){
            if(err){
                return res.status(400).send(err);
            }

            const user_id = decoded.id;

            const [results] = await db.promise().query("SELECT units.id, units.desc, units.image FROM units where units.id NOT IN (select tenants.unit_id from tenants) AND units.id NOT IN (SELECT reservations.unit_id FROM reservations WHERE reservations.user_id = ? AND reservations.status = 1)",[user_id]);
            res.send(results);
            
        });
        
        
    }
    catch(err){
        console.log(err);
    }
});

app.get('/api/units/:id', async (req, res) => {
    try{
        const[[row]] = await db.promise().query(`SELECT * FROM units WHERE id = ?`,[req.params.id]);
        if(!row) return res.status(404).send('The unit with the given ID was not found.');
        res.send(row);
    }
    catch(err){
        console.log(err);
    }
});

app.put('/api/units/:id', async (req, res) => {
    try{
        const {desc, image} = req.body;
        const [{affectedRows}] = await db.promise().query(`
        UPDATE units
        SET
        \`desc\`= ?,
        image = ?

        WHERE id = ?
        `,[desc, image, req.params.id]);
        if(!affectedRows) return res.status(404).send('The unit with the given ID was not found.');
        res.send('Successfully Updated');
    }
    catch(err){
        console.log(err);
    }
});

app.delete('/api/units/:id', async(req, res) => {
    try{  
        const [{affectedRows}] = await db.promise().query(`DELETE FROM units WHERE id = ?`,[req.params.id]);
        if(!affectedRows) return res.status(404).send('The unit with the given ID was not found.');
        res.send({ message: "Successfully Deleted" });
    }
    catch(err){
        console.log(err);
    }
});

//Bills

app.post('/api/bills', async (req, res) => {
    try{
        const {tenant_id,date, particular, amount_due} = req.body;
        const [results] = await db.promise().query(`
        INSERT INTO bills(\`tenant_id\`,\`date\`,\`particular\`,\`amount_due\`) VALUES
        (?,?,?,?)`,[tenant_id, date, particular,amount_due]);
        res.send(results);
    }
    catch(err){
        console.log(err);
    }
});


app.get('/api/bills/:tenant_id', async (req, res) => {
    try{
        const[results] = await db.promise().query(`SELECT bills.id, bills.tenant_id, DATE_FORMAT(bills.\`date\`,'%Y-%m-%d') as \`date\`,particulars.description as particular, bills.amount_due, (bills.amount_due - sum(payments.amount_paid)) as balance FROM bills left join payments on payments.bill_id = bills.id join particulars on particulars.id = bills.particular  WHERE tenant_id = ? GROUP BY bills.id`,[req.params.tenant_id]);
        //if(!row) return res.status(404).send('The tenant with the given ID was not found.');
        res.send(results);
    }
    catch(err){
        console.log(err);
    }
});

app.get('/api/bills/get/:id', async (req, res) => {
    try{
        const[[row]] = await db.promise().query(`SELECT bills.id, bills.tenant_id, DATE_FORMAT(bills.\`date\`,'%Y-%m-%d') as \`date\`, particulars.description as particular, bills.amount_due, (bills.amount_due - sum(payments.amount_paid)) as balance FROM bills left join payments on payments.bill_id = bills.id join particulars on particulars.id = bills.particular WHERE bills.id = ?`,[req.params.id]);
        if(!row) return res.status(404).send('The bill with the given ID was not found.');
        res.send(row);
    }
    catch(err){
        console.log(err);
    }
});

app.post('/api/my-bills', async (req, res) => {
    try{
        const {token} = req.body;
        jwt.verify(token, 'privKey=sTThw342', async function(err, decoded){
            if(err){
                return res.status(400).send(err);
            }

            const user_id = decoded.id;

            const[results] = await db.promise().query(`SELECT bills.id, bills.tenant_id, DATE_FORMAT(bills.\`date\`,'%Y-%m-%d') as \`date\`,particulars.description as particular, bills.amount_due, (bills.amount_due - sum(payments.amount_paid)) as balance FROM bills left join payments on payments.bill_id = bills.id join particulars on particulars.id = bills.particular join tenants on tenants.id = bills.tenant_id  WHERE tenants.user_id = ? GROUP BY bills.id`,[user_id]);
            res.send(results);
        });
    }
    catch(err){
        console.log(err);
    }
});


app.put('/api/bills/:id', async (req, res) => {
    try{
        const {date, particular, amount_due} = req.body;
        const [{affectedRows}] = await db.promise().query(`
        UPDATE bills
        SET
        \`date\`= ?,
        \`particular\`= ?,
        \`amount_due\`= ?

        WHERE id = ?
        `,[date, particular, amount_due, req.params.id]);
        if(!affectedRows) return res.status(404).send('The bill with the given ID was not found.');
        res.send('Successfully Updated');
    }
    catch(err){
        console.log(err);
    }
});


//Payments
app.post('/api/payments', async (req, res) => {
    try{
        const {bill_id, amount_paid, date, particulars} = req.body;
        const [results] = await db.promise().query(`
        INSERT INTO payments(\`bill_id\`,\`amount_paid\`,\`date\`,\`particulars\`) VALUES
        (?,?,?,?)`,[bill_id, amount_paid, date, particulars]);
        res.send(results);
    }
    catch(err){
        console.log(err);
    }
});

app.get('/api/payments/:bill_id', async (req, res) => {
    try{
        const[results] = await db.promise().query(`SELECT id, bill_id, amount_paid, DATE_FORMAT(\`date\`,'%Y-%m-%d') as \`date\`, particulars FROM payments WHERE bill_id = ?`,[req.params.bill_id]);
        //if(!row) return res.status(404).send('The tenant with the given ID was not found.');
        res.send(results);
    }
    catch(err){
        console.log(err);
    }
});


//Users and Authentication
app.post('/api/users', async (req, res) => {
    try{
        const {first_name, last_name, email, contact, password} = req.body;

        const[[row]] = await db.promise().query(`SELECT id FROM users WHERE email = ?`,[email]);
        if(row) return res.status(400).send('Email is already exists!');        

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);

        

        const [results] = await db.promise().query(`
        INSERT INTO users(first_name,last_name,contact,email,password,role_id) VALUES
        (?,?,?,?,?,?)`,[first_name, last_name, contact, email,hashed, 2]);
        res.send({first_name: first_name, last_name: last_name});
    }
    catch(err){
        console.log(err);
    }
});

app.post('/api/auth', async (req, res) => {
    try{
        const {email, password} = req.body;
        const [[user]] = await db.promise().query(`
        SELECT id, first_name, last_name, email, password, role_id FROM users WHERE email = ?`,[email]);
        if(!user) return res.status(400).send('Invalid email or password!');
        const {id, first_name, last_name, password: hashed_password, role_id} = user;

        const validPassword = await bcrypt.compare(password, hashed_password);
        if(!validPassword) return res.status(400).send('Invalid email or password!');

        const token = jwt.sign({id, first_name : first_name, last_name: last_name, email: email, role_id: role_id},'privKey=sTThw342');
        
        res.send({token: token});
    }
    catch(err){
        console.log(err);
    }
});

app.post('/api/userinfo', (req, res) => {
    try{
        const {token} = req.body;
        jwt.verify(token, 'privKey=sTThw342', function(err, decoded){
            if(err){
                return res.status(400).send(err);
            }
            res.send(decoded);
        });
    }
    catch(err){
        res.status(400).send({message: "Error Decoding Token!"});
    }
});

app.get('/api/users', async (req, res) => {
    try{
        const [results] = await db.promise().query("SELECT users.id, users.last_name, users.first_name, users.email, users.contact, users.address, users.photo, DATE_FORMAT(users.birth_date,'%M %d, %Y') as birth_date, occupations.description as occupation  FROM users left join occupations on occupations.id = users.occupation");
        res.send(results);
    }
    catch(err){
        console.log(err);
    }
});


app.get('/api/users-unreserved', async (req, res) => {
    try{
        const [results] = await db.promise().query("SELECT users.id, users.last_name, users.first_name FROM users WHERE users.id NOT IN (SELECT tenants.user_id from tenants WHERE tenants.user_id = users.id)");
        res.send(results);
    }
    catch(err){
        console.log(err);
    }
});


app.put('/api/users/:id', async (req, res) => {
    try{
        const {token, password} = req.body;
        jwt.verify(token, 'privKey=sTThw342', async function(err, decoded){
            if(err){
                return res.status(400).send(err);
            }

            if(decoded.role_id != 1) return res.status(400).send({ message : "Unauthorized Access" });

            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(password, salt);
              
            const [{affectedRows}] = await db.promise().query(`
            UPDATE users
            SET
            password= ?

            WHERE id = ?
            `,[hashed, req.params.id]);
            if(!affectedRows) return res.status(404).send('The user with the given ID was not found.');
            res.send('Successfully Updated');
            
            
        });

    }
    catch(err){
        console.log(err);
    }
});


//Reservations


app.post('/api/reservations', async (req, res) => {
    try{
        const {token, unit_id} = req.body;
        jwt.verify(token, 'privKey=sTThw342', async function(err, decoded){
            if(err){
                return res.status(400).send(err);
            }

            const user_id = decoded.id;
            date = new Date();
            month = '' + (date.getMonth() + 1),
            day = '' + date.getDate(),
            year = date.getFullYear();   
            
            if (month.length < 2) 
                month = '0' + month;
            if (day.length < 2) 
                day = '0' + day;

            date = [year, month, day].join('-');

            const [results] = await db.promise().query("INSERT INTO reservations(date,user_id,unit_id,status,notification_status) VALUES(?,?,?,?,'unread')",[date,user_id, unit_id,1]);
            res.send(results);
            
        });

    }
    catch(err){
        console.log(err);
    }
});

app.post('/api/my-reservations', async (req, res) => {
    try{

        const {token} = req.body;
        jwt.verify(token, 'privKey=sTThw342', async function(err, decoded){
            if(err){
                return res.status(400).send(err);
            }

            const user_id = decoded.id;

            const [results] = await db.promise().query("SELECT reservations.id, DATE_FORMAT(reservations.date,'%Y-%m-%d') as date, units.desc, reservations.status, units.image, reservations.receipt FROM reservations join units on units.id = reservations.unit_id WHERE reservations.user_id = ?",[user_id]);
            res.send(results);
            
        });
        
        
    }
    catch(err){
        console.log(err);
    }
});

app.post('/api/my-reservations/cancel', async (req, res) => {
    try{

        const {token, id} = req.body;
        jwt.verify(token, 'privKey=sTThw342', async function(err, decoded){
            if(err){
                return res.status(400).send(err);
            }

            const user_id = decoded.id;

            const [results] = await db.promise().query("UPDATE reservations SET status=4 WHERE reservations.id = ?",[id]);
            res.send(results);
            
        });
        
        
    }
    catch(err){
        console.log(err);
    }
});


app.post('/api/reservation-requests', async (req, res) => {
    try{

        const {token} = req.body;
        jwt.verify(token, 'privKey=sTThw342', async function(err, decoded){
            if(err){
                return res.status(400).send(err);
            }

            if(decoded.role_id != 1){
                return res.status(400).send("Unauthorized Request");
            }

            const user_id = decoded.id;

            const [results] = await db.promise().query("SELECT reservations.id,  users.first_name, users.last_name, users.email, users.contact, DATE_FORMAT(reservations.date,'%Y-%m-%d') as date, units.desc, reservations.status, reservations.unit_id, reservations.user_id, units.image, reservations.receipt, users.photo FROM reservations join units on units.id = reservations.unit_id join users on users.id = reservations.user_id");
            res.send(results);
            
        });
        
        
    }
    catch(err){
        console.log(err);
    }
});

app.post('/api/reservation-requests/cancel', async (req, res) => {
    try{

        const {token, id} = req.body;
        jwt.verify(token, 'privKey=sTThw342', async function(err, decoded){
            if(err){
                return res.status(400).send(err);
            }

            if(decoded.role_id == 1){
                const [results] = await db.promise().query("UPDATE reservations SET status=4 WHERE reservations.id = ?",[id]);
                res.send(results);

            }else{
                return res.status(400).send({"error" : "Unauthorized Access"});
            }

            
            
        });
        
        
    }
    catch(err){
        console.log(err);
    }
});



app.post('/api/approve-reservation', async (req, res) => {
    try{

        const {token, id, unit_id, user_id} = req.body;
        jwt.verify(token, 'privKey=sTThw342', async function(err, decoded){
            if(err){
                return res.status(400).send(err);
            }

            if(decoded.role_id != 1){
                return res.status(400).send("Unauthorized Request");
            }

            const [update_reservation_status] = await db.promise().query("UPDATE reservations SET status = 2 WHERE id = ?",[id]);

            const [results] = await db.promise().query("INSERT INTO tenants(unit_id,user_id) VALUES(?,?)",[unit_id, user_id]);
            res.send(results);
            
        });
        
        
    }
    catch(err){
        console.log(err);
    }
});

app.post('/api/check-userinfo', async (req, res) => {
    try{

        const {token} = req.body;
        jwt.verify(token, 'privKey=sTThw342', async function(err, decoded){
            if(err){
                return res.status(400).send(err);
            }

            const user_id = decoded.id;

            const [[results]] = await db.promise().query("SELECT COUNT(*) AS is_userinfo_incomplete, users.first_name FROM users WHERE (users.photo IS NULL OR users.address IS NULL OR users.birth_date IS NULL OR users.contact IS NULL OR users.occupation IS NULL) AND users.id = ?",[user_id]);
            res.send(results);
            
        });
        
        
    }
    catch(err){
        console.log(err);
    }
});


app.get('/api/occupations', async (req, res) => {
    try{
        const [results] = await db.promise().query("SELECT * FROM occupations");
        res.send(results);
    }
    catch(err){
        console.log(err);
    }
});

app.put('/api/update-userinfo', upload.single('photo'), async (req, res, next) => {
    const token = req.body.token;
    const filename = req.file.filename;
    const address = req.body.address;
    const birth_date = req.body.birth_date;
    const occupation = req.body.occupation;

    try{

        jwt.verify(token, 'privKey=sTThw342', async function(err, decoded){
            if(err){
                return res.status(400).send(err);
            }

            const user_id = decoded.id;

            const [{affectedRows}] = await db.promise().query(`
            UPDATE users
            SET
            address= ?,
            birth_date = ?,
            occupation = ?,
            photo = ?

            WHERE id = ?
            `,[address, birth_date, occupation, filename, user_id]);
            if(!affectedRows) return res.status(404).send('The user with the given ID was not found.');
            res.send({filename: filename, user_id: user_id});
                
        });
        
        
    }
    catch(err){
        console.log(err);
    }


});



//Particulars
app.post('/api/particulars', async (req, res) => {
    try{
        const {description} = req.body;
        const [results] = await db.promise().query(`
        INSERT INTO particulars(description) VALUES
        (?)`,[description]);
        
        
        res.send(results);
    }
    catch(err){
        console.log(err);
    }
});


app.get('/api/particulars', async (req, res) => {
    try{
        const [results] = await db.promise().query("SELECT * FROM particulars");
        res.send(results);
    }
    catch(err){
        console.log(err);
    }
});

app.get('/api/particulars/:id', async (req, res) => {
    try{
        const[[row]] = await db.promise().query(`SELECT * FROM particulars WHERE id = ?`,[req.params.id]);
        if(!row) return res.status(404).send('The particular with the given ID was not found.');
        res.send(row);
    }
    catch(err){
        console.log(err);
    }
});


app.put('/api/particulars/:id', async (req, res) => {
    try{
        const {description} = req.body;
        const [{affectedRows}] = await db.promise().query(`
        UPDATE particulars
        SET
        description= ?

        WHERE id = ?
        `,[description, req.params.id]);
        if(!affectedRows) return res.status(404).send('The particular with the given ID was not found.');
        res.send('Successfully Updated');
    }
    catch(err){
        console.log(err);
    }
});



app.post('/api/upload', upload.single('receipt'), async (req, res, next) => {
    const filename = req.file.filename;
    const reservation_id = req.body.reservation_id;

    try{
        
        const [{affectedRows}] = await db.promise().query(`
        UPDATE reservations
        SET
        receipt= ?

        WHERE id = ?
        `,[filename, reservation_id]);
        if(!affectedRows) return res.status(404).send('The reservation with the given ID was not found.');
        res.send({filename: filename, reservation_id: reservation_id});
    }
    catch(err){
        console.log(err);
    }


});

app.get('/uploads/:filename',(req,res) => {
    const filename = req.params.filename;
    const file = `${__dirname}/uploads/${filename}`;
    res.set("Content-Disposition", "inline");
    res.sendFile(file);
});


//Notifications
app.get('/api/notifications', async (req, res) => {
    try{
        const [[results]] = await db.promise().query("SELECT COUNT(*) as count from reservations WHERE reservations.status = 1 AND notification_status = 'unread'");
        res.send(results);
    }
    catch(err){
        console.log(err);
    }
});


app.put('/api/mark-notification-read', async (req, res) => {
    try{
        const [{affectedRows}] = await db.promise().query(`
        UPDATE reservations
        SET
        notification_status= 'read'`);

        if(!affectedRows) return res.status(404).send('The notification with the given ID was not found.');
        res.send({message: 'Successfully Updated'});
    }
    catch(err){
        console.log(err);
    }
});















const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Listening on port ${port}...`));