import express from 'express';
import { ImportController } from '../controllers/import-controller'; 
import multer from 'multer';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 最大5MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.endsWith('.csv') ||
      file.originalname.endsWith('.xlsx')
    ) {
      cb(null, true);
    } else {
      cb(new Error('仅支持CSV或XLSX文件上传'));
    }
  },
});

// 批量导入
router.post('/import/:type', upload.single('file'), ImportController.importData);

// 清空数据
router.post('/import/:type/clear', ImportController.clearData);

export default router;
