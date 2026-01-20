import fs from 'fs/promises';
import { PDFParse } from 'pdf-parse';

/* *
*Extract text from PDF file
* @params {string} filePath - Path to PDF file
* @returns {Promise<{text: string, numPages:number}>}

*/

export const extractTextFromPDf = async (filePath)=>{
    try {
        const dataBuffer = await fs.readFile(filePath);
        //pdf-parse expects a Unit8Array, not a Buffer
        const parser = new PDFParse(new Uint8Array(dataBuffer));
        const data = await parser.getText();

        return {
            text: data.text,
            numPages:data.numPages,
            info:data.info,
        };
    }catch(error){
        console.log("PDF parsing error", error)
        
    }
};