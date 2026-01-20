const errorHandler = (err,req,res,next)=>{
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Server Error';

    //Mongose bad ObjectId
    if(err.name === 'CastError') {
        message = 'Resource not found';
        statusCode = 404;
    }

    //Mongose duplicate key
    if(err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        message = `${field} already exists`;
        statusCode = 400; 
    }

    //Mongoose validator error
    if(err.name === 'validationError'){
        message = Object.values(err.errors).map(val=> val.message).join(', ');
        statusCode(400);
    }

    //Multer file size error
    if(err.code === 'LIMIT_FILE_SIZE'){
        message = 'File size exceeds the maximum limit of 10MB';
        statusCode = 400
    }

    //JWT error
    if(err.name === 'JsonWebTokenError'){
        message = 'Invalidl token';
        statusCode = 401;
    }

    if(err.name === 'TokenExpiredError'){
        message = 'Token Expired';
        statusCode = 401;
    }

    console.log('Error:',{
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack: undefined
    });

    res.status(statusCode).json({
        success: false,
        error: message,
        statusCode,
        ...(process.env.NODE_ENV === 'development' && {stack : err.stackk})
    });
};

export default errorHandler;