module.exports = [
    {
        context: ['/'], //redirect everything that starts with / to target
        target: 'http://localhost:3000',
        secure: false,
        logLevel: 'debug'
    }
]