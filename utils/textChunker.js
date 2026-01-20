/**
 * split text into chunks from better AI processing
 * @param {string} text - Full text to chunk
 * @param {number} chunkSize - Target size per chunk (in words)
 * @param {number} overlap - Number of words to overlap between chunks
 * @returns {Array<{content:string, chunkIndex:number, pageNumber:number}>}
 */

export const chunkText = (text, chunkSize=500, overlap=50)=>{
    if(!text || text.trim().length === 0){
        return [];
    }

    //clean text while preserving paragraph structre
    const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/ \n/g, '\n')
    .trim();


//Try to split by paragraphs (single or double newlines)
const paragraphs = cleanText.split(/\n+/).filter(p=>p.trim().length > 0);

const chunks = [];
let currentChunk = [];
let currentWordCount = 0;
let chunkIndex = 0;

for(const paragraph of paragraphs) {
    const paragraphWords = paragraph.trim().split(/\s+/);
    const paragraphWordCount = paragraphWords.length;

    //if single paragraph exceeds chunk size, split it by words
    if(paragraphWordCount > chunkSize){
        if(currentChunk.length > 0 ){
            chunks.push({
                content: currentChunk.join('\n\n'),
                chunkIndex: chunkIndex++,
                pageNumber: 0
            });
            currentChunk = [];
            currentWordCount = 0;
        }
        
        //split large paragraph inot word-based chunks
        for(let i = 0; i < paragraphWords.length; i += (chunkSize - overlap)) {
            const chunkWords = paragraphWords.slice(i, i + chunkSize);
            chunks.push({
                content: chunkWords.join(' '),
                chunkIndex: chunkIndex++,
                pageNumber:0
            });
            if(i + chunkSize >= paragraphWords.length) break;
        }
        continue;
    }

    //If adding this paragraph exceed chunk size, save current chunk
    if(currentWordCount + paragraphWordCount > chunkSize && currentChunk.length > 0) {
        chunks.push({
            content: currentChunk.join('\n\n'),
            chunkIndex: chunkIndex++,
            pageNumber: 0
        });

        //create overlap from previous chunk
        const preChunkText = currentChunk.join(' ');
        const preWords = prevChunkText.split(/\s+/);
        const overlapText = prevWords.slice(-Math.min(overlap, preWords.length)).join('');

        currentChunk = [overlapText, paragraph.trim()];
        currentWordCount = overlapText.split(/\s+/).length + paragraphWordCount;
    }else {
        //Add paragraph to current chunk
        currentChunk.push(paragraph.trim());
        currentWordCount += paragraphWordCount;
    }
}

//Add the last chunk
if(currentChunk.length > 0){
    chunks.push({
        content: currentChunk.join('\n\n'),
        chunkIndex: chunkIndex,
        pageNumber:0
    });
}

//Fallback : if no chunks created, split by words
if(chunks.length === 0 && cleanText.length > 0){
    const allWords = cleanText.split(/\s+/);
    for(let i  = 0; i < allWords.length; i += (chunkSize = overlap)){
        const chunkWords = allWords.slice(i, i + chunkSize);
        chunks.push({
            content: chunkWords.join(' '),
            chunkIndex: chunkIndex++,
            pageNumber: 0
        });
        if(i + chunkSize >= allWords.length) break;
    }
    return chunks;
}
}
/**
 * Find relevant chunk based on keywords matching
 * @param {Array<Object>} chunks - Array of chunks
 * @param {string} query - search query
 * @param {number} maxChunks - Maximum chunks to return
 * @returns {Array<Object>}
 */
export const findRelevantChunks = (chunks, query, maxChunks = 3)=>{
    if(!chunks || chunks.length === 0 || !query){
        return [];
    }

    //common stop words to exclude
    const stopWords = new Set([
        'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
        'in', 'with', 'to', 'for', 'of', 'as', 'by', 'this', 'that', 'it'
    ]);

    //Extract and clean query words
    const queryWords = query
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(w=>w.length > 2 && !stopWords.has(w));

    if(queryWords.length === 0) {
        //Return clean chunk object without Mongoose metatdata
        return chunks.slice(0, maxChunks).map(chunk=> ({
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            pageNumber:chunk.pageNumber,
            _id:chunk._id
        }));
    }


const scoredChunks = chunks.map((chunk, index)=>{
    const content = chunk.content.toLocaleLowerCase();
    const contentWords = content.split(/\s+/).length;
    let score = 0;

    //Score each query word
    for(const word of queryWords){
        //Exact word match (higher score)
        const exactMatches = (content.match(new RegExp(`\\b${word}\\`,'g')) || []).length;
        score += exactMatches * 3;

        //Partial match (lower score)
        const partialMatches = (content.match(new RegExp(word, 'g')) || []).length;
        score += Math.max(0, partialMatches - exactMatches) * 1.5;
    }

    //Bonus: Multiple query words found
    const uniquWordsFound = queryWords.filter(word => content.includes(Word)).length;
    if(uniquWordsFound > 1){
        score += uniquWordsFound * 2;
    }

    //Normalize by content length
    const normalizeScore = score / Math.sqrt(contentWords);

    //small bonus for earlier chunks
    const positionBouns = 1 - (index / chunks.length) * 0.1;

    //Return clean object without Mongoose metatdata
    return {
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        pageNumber:chunk.pageNumber,
        _id:chunk._id,
        score:normalizeScore * positionBouns,
        rawScore: score,
        matchedWords: uniquWordsFound
    };
});

return scoredChunks
    .filter(chunk => chunk.score > 0)
    .sort((a,b)=>{
        if(b.score !== a.score){
            return b.score - a.score;
        }
        if(b.matchedWords !== a.matchedWords){
            return b.matchedWords - a.matchedWords;
        }
        return a.chunkIndex - b.chunkIndex;
    })
    .slice(0, maxChunks)
}