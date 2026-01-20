import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import Quiz from "../models/Quiz.js";
import ChatHistory from "../models/ChatHistory.js";
import * as geminiService from "../utils/geminiService.js";
import { findRelevantChunks } from "../utils/textChunker.js";

// ===============================
// Generate Flashcards
// ===============================
// @route POST /api/ai/generate-flashcards
// @access Private
export const generateFlashcards = async (req, res, next) => {
  try {
    const { documentId, count = 10 } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId",
        statusCode: 400,
      });
    }

    // ✅ Fetch document safely
    const doc = await Document.findOne({
      _id: documentId,
      userId: req.user._id,
      status: "ready",
    });

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: "Document not found or not ready",
        statusCode: 404,
      });
    }

    // ✅ Generate flashcards
    const cards = await geminiService.generateFlashcards(
      doc.extractedText,
      parseInt(count)
    );

    // ✅ Save flashcards
    const flashcardSet = await Flashcard.create({
      userId: req.user._id,
      documentId: doc._id,
      cards: cards.map((card) => ({
        question: card.question,
        answer: card.answer,
        difficulty: card.difficulty,
        reviewCount: 0,
        isStarred: false,
      })),
    });

    res.status(201).json({
      success: true,
      data: flashcardSet,
      message: "Flashcards generated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ===============================
// Generate Quiz
// ===============================
// @route POST /api/ai/generate-quiz
// @access Private
export const generateQuiz = async (req, res, next) => {
  try {
    const { documentId, numQuestions = 5, title } = req.body;
    if(!documentId){
        return res.status(400).json({
            success:false,
            error: 'Please provide valid documen Id',
            statusCode: 400
        })
    }
    const document = await Document.findOne({
        _id: documentId,
        userId: req.user._id,
        status: 'ready'
    });
    if(!document) {
        return res.status(404).json({
            success: false,
            error:'Document not found! or not rady!',
            statusCode: 404
        })
    }

    //Generate quiz using Gemini
    const questions = await geminiService.generateQuiz(
        document.extractedText,
        parseInt(numQuestions)
    );

    //save to database
    const quiz = await Quiz.create({
        userId: req.user._id,
        documentId: document._id,
        title: title || `${document.title} - Quiz`,
        questions: questions,
        totalQuestions: questions.length,
        userAnswer: [],
        score:0
    });
    res.status(201).json({
        success: true,
        data: quiz,
        message:'Quiz generated successfully',
        statusCode: 201
    });
    
  } catch (error) {
    next(error);
  }
};

// ===============================
// Generate Summary
// ===============================
// @route POST /api/ai/generate-summary
// @access Private
export const generateSummary = async (req, res, next) => {
  try {
    const { documentId } = req.body;

    if(!documentId){
        return res.status(400).json({
            success: false, 
            error: 'Please provide documentId',
            statusCode: 400
        });
    }

    const document = await Document.findOne({
        _id: documentId,
        userId: req.user._id,
        status: 'ready'
    });
    if(!document) {
        return res.status(404).json({
            success:false,
            error:'Document not found or not ready',
            statusCode: 404
        });
    }

    //Generate Summary using Gimini
    const summary = await geminiService.generateSummary(document.extractedText);
    res.status(200).json({
        success: true,
        data: {
            documentId: document._id,
            title: document.title,
            summary
        },
        message: 'Summary generated successfully!'
    });
    
  } catch (error) {
    next(error);
  }
};

// ===============================
// Chat with Document
// ===============================
// @route POST /api/ai/chat
// @access Private
export const chat = async (req, res, next) => {
  try {
    const { documentId, question } = req.body;

    if(!documentId || !question) {
        return res.status(400).json({
      success: false,
      error: "Please provide documentId and question",
      statusCode: 400
    });
    }
    const document = await Document.findOne({
        _id: documentId,
        userId: req.user._id,
        status: 'ready'
    });

    if(!document) {
        return res.status(404).json({
            success: false,
            error:'Document not found or not ready',
            statusCode: 404
        });
    }
    
    //Find relevant chunks
    const relevantChunks = findRelevantChunks(document.chunks, question, 3);
    const chunkIndices = relevantChunks.map(c=> c.chunkIndex);
    //Get or create chat history
    let chatHistory = await ChatHistory.findOne({
        userId: req.user._id,
        documentId: document._id
    });
    if(!chatHistory) {
        chatHistory = await ChatHistory.create({
            userId: req.user._id,
            documentId: document._id,
            messages:[]
        });
    }

    //Generate response using Gimini
    const answer = await geminiService.chatWithContext(question, relevantChunks);

    //save conversation
    chatHistory.message.push(
        {
            role: 'user',
            content:question,
            timestamp: new Date(),
            relevantChunks: []
        },
        {
            role: 'assistant',
            content: answer,
            timestamp: new Date(),
            relevantChunks: chunkIndices
        }
    );
    await chatHistory.save();
    res.status(200).json({
        success:true,
        data: {
            question,
            answer,
            relevantChunks: chunkIndices,
            chatHistoryId:chatHistory._id
        },
        message: 'Response generated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ===============================
// Explain Concept
// ===============================
// @route POST /api/ai/explain-concept
// @access Private
export const explainConcept = async (req, res, next) => {
  try {
    const { documentId, concept } = req.body;

    if(!documentId || !concept) {
        return res.json({
            success: false,
            error: 'Please provide documentId and concept',
            statusCode: 404
        });
    }

    const document = await Document.findOne({
        _id: documentId,
        userId: req.user._id,
        status: 'ready'
    });
    if(!document) {
        return res.status(404).json({
            success: false,
            error: 'Document not foudn or not ready',
            statusCode: 404
        });
    }

    //Find relevant chunks for the concept
    const relevantChunks = findRelevantChunks(document.chunks, concept, 3);
    const context = relevantChunks.map(c=> c.content).join('\n\n');

    //Generate explanation using Gimini
    const explanation = await geminiService.explainConcept(concept,context);
    res.status(200).json({
        success: true,
        data:{
            concept,
            explanation,
            relevantChunks: relevantChunks.map(c=> c.chunkIndex)
        },
        message: 'Explanation generated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ===============================
// Get Chat History
// ===============================
// @route GET /api/ai/chat-history/:documentId
// @access Private
export const getChatHistory = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    if(!documentId) {
        return res.status(400).json({
            success:false,
            error: 'Please provide documentId',
            statusCode:400
        });
    }

    const chatHistory = await ChatHistory.findOne({
        userId: req.user._id,
        documentId: documentId
    }).select('message'); //only retrive the messages array

    if(!chatHistory){
        return res.status(200).json({
            success: true,
            data: [], //Retrun an empty arrary if no chat history found
            message: 'No chat history found for this document'
        });
    }
    

    res.status(200).json({
        success: true,
        data: chatHistory.message,
        message: 'Chat history retrived successfully'
    });
  } catch (error) {
    next(error);
  }
};
