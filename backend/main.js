require('dotenv').config()
const morgan = require('morgan')
const express = require('express')
const sha1 = require('sha1');
const mysql = require('mysql2/promise')
const {MongoClient} = require('mongodb');
const multer = require('multer')
const fs = require('fs')
const AWS = require('aws-sdk')

const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000

const app = express()
const AWS_S3_HOSTNAME = process.env.AWS_S3_HOSTNAME;
const AWS_S3_ACCESS_KEY = process.env.AWS_S3_ACCESS_KEY;
const AWS_S3_SECRET_ACCESSKEY = process.env.AWS_S3_SECRET_ACCESS_KEY;
const AWS_S3_BUCKETNAME = process.env.AWS_S3_BUCKETNAME;

const spaceEndPoint = new AWS.Endpoint(AWS_S3_HOSTNAME);

//SQL Query
const SQL_GETDETAILBYUSERID = `select password from user where user_id = ?`;

//configure the databases
const MONGO_URL = 'mongodb://localhost:27017';
const MONGO_DB = 'pafassessment';
const MONGO_COLLECTION = 'shares';

const mongoClient = new MongoClient(MONGO_URL, {
    useNewUrlParser: true, useUnifiedTopology: true
})

const upload = multer({
    dest: process.env.TMP_DIR || 'opt/tmp/uploads'
})

const pool = mysql.createPool({
    host: process.env.MYSQL_SERVER,
    port: process.env.MYSQL_SVR_PORT,
    user: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    connectionLimit: process.env.MYSQL_CON_LIMIT,
    database: process.env.MYSQL_SCHEMA
})

const s3 = new AWS.S3({
    endpoint: spaceEndPoint,
    accessKeyId: AWS_S3_ACCESS_KEY,
    secretAccessKey: AWS_S3_SECRET_ACCESSKEY
});

//start the server
//check the database are up before starting the server
const pingSQL = (async () => {
    const conn = await pool.getConnection();
    console.log('Pinging database...')
    await conn.ping();
    conn.release();
    return true
})()

const pingMONGO = (async() => {
    mongoClient.connect()
    return true
})()

const makeQuery = (sql, pool) => {
    return (async(args) => {
        const conn = await pool.getConnection();
        try{
            let results = await conn.query(sql, args)
            return results[0]
        }
        catch(e){
            console.error('error',e)
        }
        finally{
            conn.release();
        }
    })
}

const getUser = makeQuery(SQL_GETDETAILBYUSERID, pool)

const mkShare = (params, image) => {
    return {
        ts: new Date(),
        title: params.title,
        comments: params.comments,
        image
    }
}

const readFile = (path) => new Promise(
    (resolve, reject) => 
        fs.readFile(path, (err, buff) => {
            if(null != err)
                reject(err)
            else
                resolve(buff)
        })
)

const putObject = (file, buff, s3) => new Promise(
    (resolve, reject) => {
        const params = {
            Bucket: AWS_S3_BUCKETNAME,
            Key: file.filename,
            Body: buff,
            ACL: 'public-read',
            ContentType: file.mimetype,
			ContentLength: file.size
		}
		console.log('params', params)
        s3.putObject(params, (err, result) => {
			if(null != err){
				reject(err)
			}
            else
                resolve(result)
        })
    }
)

app.use(morgan('combined'))

app.use(express.static(__dirname + '/frontend'))

app.post('/login', express.json(), (req, resp) => {
	const user_id = req.body['user_id'];
	const password = sha1(req.body.password)
	console.log('user', user_id)
	console.log('password', password)

	getUser(user_id)
	.then(results =>{
		console.log('getuser', results)
		if(results.length > 0)
		{
			if(results[0].password == password)
			{
				resp.status(200).json({log:'login'})
			}
			else{
				resp.status(401).json({log:'wrong password'})
			}
		}
		else{
			resp.status(401).json({log:'no such user'})
		}
	})
	.catch(e => {
		console.log('failed login', e)
		resp.status(401)
		resp.json({log:'fail'})
	})
})

app.post('/share', upload.single('upload'), (req, resp) => {
	//const image = req.file.path
	const user_id = req.body['user_id'];
	const password = sha1(req.body.password)
	getUser(req.body.user_id)
	.then(results =>{
		console.log('getuser', results)
		if(results.length > 0)
		{
			if(results[0].password == password)
			{
				console.log('req.file.path',req.file.path)
				console.log('req.file',req.file)
				readFile(req.file.path)
				.then(buff => {
					putObject(req.file, buff, s3)
					console.log('buff', buff)
				})
				.then(result => {
					console.log('after readfile', req.file)
					const doc = mkShare(req.body, req.file.filename);
					console.log('doc', doc)
					return mongoClient
					.db(MONGO_DB)
					.collection(MONGO_COLLECTION)
					.insertOne(doc)
				})
				.then(results => {
					console.log('insert results: ', results.ops[0]._id)
					
					resp.status(200)
					//resp.end()
					resp.json({id: results.ops[0]._id})
					console.info('>>> response ended')
    			    // delete the temp file
        			fs.unlink(req.file.path, () => {})
					
				})
				.catch(e => {
					console.error('insert error: ', e)
					resp.status(500)
					resp.json({e})
				})
			}
			else{
				resp.status(401).json({log:'wrong password'})
			}
		}
		else{
			resp.status(401).json({log:'no such user'})
		}
	})
	.catch(e => {
		console.error('error', e)
		resp.status(500)
		resp.json({e})
	})
})

Promise.all([pingSQL, pingMONGO])
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Application started at PORT ${PORT}, at ${new Date()}`)
        })
    })
    .catch(e => {
        console.error('error connecting', e)
    })

// app.listen(PORT, () => {
// 	console.info(`Application started on port ${PORT} at ${new Date()}`)
// })
