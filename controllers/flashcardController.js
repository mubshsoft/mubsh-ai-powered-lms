import Flashcard from "../models/Flashcard.js";

//@desc Getall flashcards for a document
//@route GET /api/falschcards/:docuemntId
//@access Private


export const getFlashcards = async (req, res, next)=>{
    try {
        const flashcards = await Flashcard.find({
            userId : req.user._id,
            documentId: req.params.documentId
        })
        .populate('documentId', 'titile fileName')
        .sort({createdAt:-1});

        res.status(200).json({
            success: true,
            count:flashcards.length,
            data:flashcards
        })
    } catch(error){
        next (error);
    }
}

//@desc Getall flashcards for a a user
//@route GET /api/falschcards
//@access Private


export const getAllFlashcardSets = async (req, res, next)=>{
    try {
        const flashcardSets = await Flashcard.find({userId:req.user._id})
        .populate('documentId', 'title')
        .sort({ createdAt:-1});

        res.status(200).json({
            success:true,
            count:flashcardSets.length,
            data:flashcardSets,
        });
    } catch(error){
        next (error);
    }
}

//@desc Mark flashcards as reviewed
//@route POST /api/falschcards/:cardId/review
//@access Private


export const reviewFlashcard = async (req, res, next)=>{
    try {
        const flashcardSet = await Flashcard.findOne({
            'cards._id':req.params.cardId,
            userId:req.user._id
        });

        if(!flashcardSet){
            return res.status(400).json({
                success:false,
                error: 'Falshcard set or card not found',
                statusCode:404
            })
        }

        const cardIndex = flashcardSet.cards.findIndex(card => card._id.toString()=== req.params.cardId);
        if(cardIndex === -1) {
            return res.status(404).json({
                success:false,
                error:'Card not found in set',
                statusCode:404
            })
        }

        //Update reivew info
        flashcardSet.cards[cardIndex].lastReviewed = new Date();
        flashcardSet.cards[cardIndex].reviewCount +=1;

        await flashcardSet.save();

        res.status(200).json({
            success:true,
            data:flashcardSet,
            message:'Flashcard reviewed successfully'
        });
    } catch(error){
        next (error);
    }
}

//@desc toggle star/favorite on flashcard for a document
//@route PUT  /api/falschcards/:cardId/star
//@access Private


export const toggleStarFlashcard = async (req, res, next)=>{
    try {
        const flashcardSet = await Flashcard.findOne({
            'cards._id' : req.params.cardId,
            userId: req.user._id
        });

        const cardIndex = flashcardSet.cards.findIndex(card=> card._id.toString() === req.params.cardId);
        if(cardIndex === -1) {
            return res.status(404).json({
                success:false,
                error:'Card not found in set',
                statusCode:404
            });
        }

        //toggle star
        flashcardSet.cards[cardIndex].isStarred = !flashcardSet.cards[cardIndex].isStarred;
        await flashcardSet.save();
        res.status(200).json({
            success:true,
            data:flashcardSet,
            message:`Flashcard ${flashcardSet.cards[cardIndex].isStarred ? 'starred': 'unstarred'}`
        });
    } catch(error){
        next (error);
    }
}

//@desc Delete flashcards set
//@route DELETE /api/flashcards/:id
//@access Private


export const deleteFlashcardSet = async (req, res, next)=>{
    try {
        const flashcardSet = await Flashcard.findOne({
            _id:req.params.id,
            userId:req.user._id
        });

        if(!flashcardSet){
            return res.status(404).json({
                success:false,
                error:'Flashcard set not found',
                statusCode:404
            });
        }

        await flashcardSet.deleteOne();
        res.status(200).json({
            success:true,
            message:'Falshcard set deleted successfully'
        })
    } catch(error){
        next (error);
    }
}