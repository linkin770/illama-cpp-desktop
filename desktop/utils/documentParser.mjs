// 文档解析工具 - 支持 PDF/Word/Excel/TXT 等格式
import { readFileSync } from 'node:fs'
import path from 'path'

// 动态导入（这些是 optional dependencies）
let pdfParse, wordExtractor, xlsx

try {
  pdfParse = await import('pdf-parse')
} catch {}

try {
  wordExtractor = await import('word-extractor')
} catch {}

try {
  xlsx = await import('xlsx')
} catch {}

/**
 * 解析文档并提取纯文本
 * @param {string} filePath - 文件路径
 * @returns {Promise<string>} 提取的文本内容
 */
export async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  
  try {
    switch (ext) {
      case '.pdf':
        return await extractPDF(filePath)
      case '.doc':
      case '.docx':
        return await extractWord(filePath)
      case '.xls':
      case '.xlsx':
      case '.xlsb':
        return await extractExcel(filePath)
      case '.txt':
      case '.md':
        return extractTextFile(filePath)
      default:
        throw new Error(`不支持的文件格式: ${ext}`)
    }
  } catch (error) {
    throw new Error(`解析失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 解析 PDF 文件
 */
async function extractPDF(filePath) {
  if (!pdfParse) {
    throw new Error('pdf-parse 未安装')
  }
  
  const dataBuffer = readFileSync(filePath)
  const data = await pdfParse.default(dataBuffer)
  return data.text
}

/**
 * 解析 Word 文件
 */
async function extractWord(filePath) {
  if (!wordExtractor) {
    throw new Error('word-extractor 未安装')
  }
  
  try {
    // word-extractor 是 CommonJS 模块，需要正确处理
    const Extractor = wordExtractor.default || wordExtractor
    const extractor = new Extractor()
    const document = await extractor.extract(filePath)
    
    // 获取所有文本内容
    const body = document.getBody()
    const headers = document.getHeaders()
    const footnotes = document.getFootnotes()
    
    // 合并所有内容
    const text = [body, headers, footnotes]
      .filter(t => t && t.trim())
      .join('\n\n')
    
    console.log('[文档解析] Word 提取成功')
    console.log('  - Body 长度:', body?.length || 0)
    console.log('  - Headers 长度:', headers?.length || 0)
    console.log('  - Footnotes 长度:', footnotes?.length || 0)
    console.log('  - 总长度:', text.length)
    
    if (!text || text.trim().length === 0) {
      throw new Error('Word 文档内容为空')
    }
    
    return text
  } catch (error) {
    console.error('[文档解析] Word 提取失败:', error)
    throw error
  }
}

/**
 * 解析 Excel 文件
 */
async function extractExcel(filePath) {
  if (!xlsx) {
    throw new Error('xlsx 未安装')
  }
  
  const workbook = xlsx.default.readFile(filePath)
  const texts = []
  
  // 提取所有工作表的文本
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    const text = xlsx.default.utils.sheet_to_txt(worksheet)
    texts.push(text)
  }
  
  return texts.join('\n\n')
}

/**
 * 读取文本文件
 */
function extractTextFile(filePath) {
  return readFileSync(filePath, 'utf-8')
}
