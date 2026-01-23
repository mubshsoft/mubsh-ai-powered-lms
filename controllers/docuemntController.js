import  Document  from "../models/Document.js";
import Flashcard from '../models/Flashcard.js';
import Quiz from '../models/Quiz.js';
import { extractTextFromPDf } from '../utils/pdfParser.js';
import { chunkText } from '../utils/textChunker.js';
import fs from 'fs/promises';
import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary.js';



//@desc Uploads PDF document
//@route POST /api/documents/uploads
//@access private
export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a PDF file',
      });
    }

    const { title } = req.body;
    if (!title) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Please provide a document title',
      });
    }

    // ✅ Upload PDF to Cloudinary
const cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
  resource_type: 'raw',
folder: 'lms/documents',
use_filename: true,
unique_filename: false,

});

console.log('☁️ Cloudinary upload:', cloudinaryResult.secure_url);



    // ✅ Create document record
    const document = await Document.create({
      userId: req.user._id,
      title,
      fileName: req.file.originalname,
      filePath: cloudinaryResult.secure_url, // Cloudinary URL
      fileSize: req.file.size,
      status: 'processing',
    });

    // ✅ Process PDF using local file
    processPDF(document._id, req.file.path).catch(err => {
      console.log('PDF processing error', err);
    });

    res.status(201).json({
      success: true,
      data: document,
      message: 'Document uploaded successfully. Processing in progress...',
    });

  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};


//Helper function to process PDF 
const processPDF = async (documentId, filePath) => {
    try {
        const {text} = await extractTextFromPDf(filePath);
        //create chunk
        const chunks = chunkText(text, 500, 50);
        //update chunks
        await Document.findByIdAndUpdate(documentId, {
            extractedText: text, 
            chunks: chunks,
            status:'ready'
        });
        console.log(`Document ${documentId} processed successfully`);
    }catch(error){
        console.log(`Error processing document ${documentId}:`, error);

        await Document.findByIdAndUpdate(documentId, {
            status:'failed'
        })
    }
}

//@desc get all users documents
//@route GET /api/documents
//@access private
export const getDocuments = async (req,res, next)=>{
    try {
        const documents = await Document.aggregate([
            {
                $match: {userId: new mongoose.Types.ObjectId(req.user._id)}
            },
            {
                $lookup:{
                    from : 'flashcards', 
                    localField: '_id', 
                    foreignField: 'documentId',
                    as:'flashcardSets'
                }
            },
            {
                $lookup: {
                    from: 'quizzes',
                    localField: '_id',
                    foreignField: 'documentId',
                    as : 'quizzes'
                }
            },
            {
                $addFields: {
                    flashcardCount: { $size: '$flashcardSets'},
                    quizCount: {$size: '$quizzes'}
                }
            }, 
            {
                $project : {
                    extractedText: 0, 
                    chunks: 0, 
                    flashcardSets: 0,
                    quizzes: 0
                }
            },
            {
                $sort: {uploadDate: -1}
            }
        ]);
        
        res.status(200).json({
            success:true,
            count: documents.length,
            data: documents
        })

        
    } catch(error){
        next(error);
    }
};

//@desc Get single document with chunks
//@route GET /api/documents/:id
//@access private
export const getDocument = async (req,res,next)=>{
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            userId:req.user._id,
        });

        if(!document) {
            return res.status(404).json({
                success: false,
                error:"Document not found",
                statusCode : 404
            });
        }

        //get counts of associated flashcards and quizzes
        const flashcardCount = await Flashcard.countDocuments({documentId: document._id, userId: req.user._id});
        const quizCount = await Quiz.countDocuments({documentId: document._id, userId: req.user._id});

        //update last accessed
        document.lastAccessed = Date.now();
        await document.save();

        //combine docuent data with counts
        const documentData = document.toObject();
        documentData.flashcardCount = flashcardCount;
        documentData.quizCount = quizCount;

        res.status(200).json({
            success:true,
            data: documentData
        })
    } catch(error){
        next(error);
    }
}

//@desc Delete document
//@route DELETE /api/documents/:id
//@access private
export const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    // ✅ Delete from Cloudinary
    const publicId = document.filePath
      .split('/')
      .slice(-2)
      .join('/')
      .replace('.pdf', '');

    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
    });

    await document.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Document removed successfully!',
    });

  } catch (error) {
    next(error);
  }
};


//@desc Update document title
//@route PUT /api/documents/:id
//@access private
export const updateDocument = async (req,res,next)=>{
    try {

    } catch(error){
        next(error);
    }
};
