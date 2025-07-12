// 导出 SUBJECTS 为 JSON 文件，供前端同步使用
import { writeFileSync } from 'fs';
import { SUBJECTS } from '../constants/subjects';
import { join } from 'path';

const outputPath = join(__dirname, '../../../frontend/src/lib/subjects.json');
writeFileSync(outputPath, JSON.stringify(SUBJECTS, null, 2), 'utf-8');
console.log('已导出 SUBJECTS 到', outputPath); 