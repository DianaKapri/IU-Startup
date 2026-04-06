const ExcelJS = require('exceljs');

const DAYS = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
];

const LESSONS_PER_DAY = 10;
const LETTERS = ['А', 'Б', 'В', 'Г'];

function buildClassNames() {
  const classes = [];
  for (let grade = 1; grade <= 11; grade++) {
    for (const letter of LETTERS) classes.push(`${grade}${letter}`);
  }
  return classes;
}

function styleHeaderRow(row) {
  row.font = { bold: true, color: { argb: 'FF1F2937' } };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2F0D9' },
  };
  row.alignment = { vertical: 'middle', horizontal: 'center' };
}

function styleLessonColumn(worksheet) {
  for (let r = 2; r <= LESSONS_PER_DAY + 1; r++) {
    const cell = worksheet.getCell(r, 1);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFDE9D9' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  }
}

function setBorders(worksheet, rowsCount, colsCount) {
  for (let r = 1; r <= rowsCount; r++) {
    for (let c = 1; c <= colsCount; c++) {
      worksheet.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      };
    }
  }
}

function createScheduleTemplateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ШколаПлан';
  workbook.created = new Date();
  workbook.modified = new Date();

  const classNames = buildClassNames(); // 44 класса

  for (const day of DAYS) {
    const ws = workbook.addWorksheet(day);
    const header = ['Урок', ...classNames];
    ws.addRow(header);
    styleHeaderRow(ws.getRow(1));

    for (let lesson = 1; lesson <= LESSONS_PER_DAY; lesson++) {
      ws.addRow([lesson, ...Array(classNames.length).fill('')]);
    }

    ws.columns = [
      { width: 8 },
      ...Array(classNames.length).fill({ width: 14 }),
    ];
    ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];

    styleLessonColumn(ws);
    setBorders(ws, LESSONS_PER_DAY + 1, classNames.length + 1);
  }

  return { workbook, classNames };
}

module.exports = {
  createScheduleTemplateWorkbook,
  buildClassNames,
  DAYS,
  LESSONS_PER_DAY,
};
