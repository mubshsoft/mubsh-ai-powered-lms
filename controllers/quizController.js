import Quiz from "../models/Quiz.js";


//@desc Get all quizzes fro a document
//@route GET /api/quizzes/:documentId
//@access Private

export const getQuizzes = async (req,res,next) =>{
    try{
        const quizzes = await Quiz.find({
            userId: req.user._id,
            documentId: req.params.documentId
        })
        .populate('documentId', 'title fileName')
        .sort({ createdAt: -1});

        res.status(200).json({
            success:true,
            count: quizzes.length,
            data:quizzes
        });
    } catch (error) {
        next(error);
    }
};


//@desc Get a single quiz by ID
//@route GET /api/quizzes/quiz/:id
//@access Private

export const getQuizById = async (req,res,next) =>{
    try{
        const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if(!quiz) {
            return res.status(404).json({
                success: false,
                error:'Quiz not found',
                statusCode: 404
            });
        }
        res.status(200).json({
            success:true,
            data:quiz,
        });
    } catch (error) {
        next(error);
    }
};

//@desc Submit quiz answer
//@route POST /api/quizzes/:id/submit
//@access Private

// ===============================
// SUBMIT QUIZ
// ===============================
// ===============================
// SUBMIT QUIZ
// ===============================
export const submitQuiz = async (req, res, next) => {
  try {
    const { answers } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Answers array is required",
      });
    }

    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: "Quiz not found",
      });
    }

    if (quiz.completedAt) {
      return res.status(400).json({
        success: false,
        error: "Quiz already completed",
      });
    }

    // 🔑 normalize helper
    const normalize = (str) =>
      str?.trim().replace(/\s+/g, " ").toLowerCase();

    let correctCount = 0;
    const userAnswers = [];

    answers.forEach(({ questionIndex, selectedAnswer }) => {
      const question = quiz.questions[questionIndex];
      if (!question) return;

      let correctAnswerText = question.correctAnswer;

      // ✅ REMOVE "02:" / "03:" prefix if exists
      if (/^\d+\s*:/.test(correctAnswerText)) {
        correctAnswerText = correctAnswerText.split(":").slice(1).join(":").trim();
      }

      const isCorrect =
        normalize(selectedAnswer) === normalize(correctAnswerText);

      if (isCorrect) correctCount++;

      userAnswers.push({
        questionIndex,
        selectedAnswer,
        isCorrect,
        answeredAt: new Date(),
      });

      // ✅ DEBUG LOG (NOW WILL MATCH)
      
    });

    const score = Math.round(
      (correctCount / quiz.totalQuestions) * 100
    );

    quiz.userAnswers = userAnswers;
    quiz.score = score;
    quiz.completedAt = new Date();

    await quiz.save();

    res.status(200).json({
      success: true,
      message: "Quiz submitted successfully",
      data: {
        quizId: quiz._id,
        score,
        correctCount,
        totalQuestions: quiz.totalQuestions,
        percentage: score,
        userAnswers,
      },
    });
  } catch (error) {
    next(error);
  }
};



// ===============================
// GET QUIZ RESULTS
// ===============================
export const getQuizResults = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate("documentId", "title");

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: "Quiz not found",
      });
    }

    if (!quiz.completedAt) {
      return res.status(400).json({
        success: false,
        error: "Quiz not completed yet",
      });
    }

    const detailedResults = quiz.questions.map((question, index) => {
      const userAnswer = quiz.userAnswers.find(
        (a) => a.questionIndex === index
      );

      return {
        questionIndex: index,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        selectedAnswer: userAnswer?.selectedAnswer || null,
        isCorrect: userAnswer?.isCorrect || false,
        explanation: question.explanation,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          document: quiz.documentId,
          score: quiz.score,
          totalQuestions: quiz.totalQuestions,
          completedAt: quiz.completedAt,
        },
        results: detailedResults,
      },
    });
  } catch (error) {
    next(error);
  }
};


//@desc Delete quiz
//@route Delete /api/quizzes/:id
//@access Private

export const deleteQuiz = async (req,res,next) =>{
    try{
        const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user._id
        });
        if(!quiz) {
            return res.status(404).json({
                success: false, 
                error:'Quiz not found',
                statusCode: 404
            });
        }
         await quiz.deleteOne();

         res.status(200).json({
            success: true,
            message: 'Quiz deleted successfully',
         });
    } catch (error) {
        next(error);
    }
};