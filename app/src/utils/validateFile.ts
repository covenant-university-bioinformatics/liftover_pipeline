import * as fs from 'fs';
import * as readline from 'readline';
import * as lineByLine from 'n-readlines';
import { BadRequestException } from '@nestjs/common';

type Column = {
  chr: number;
  pos: number;
  marker_name: number;
  effect_allele: number;
  alternate_allele: number;
  odds_ratio: number;
  beta: number;
  se: number;
  p: number;
  n: number;
  zscore: number;
};

const objectColumns: Partial<Column> = {};
let delimiter: string | false = '';

const getWantedLines = (filename: string) => {
  const liner = new lineByLine(filename);

  const wantedLines: string[] = [];
  let lineCounter = 0;

  let line;

  while ((line = liner.next())) {
    if (lineCounter == 2) {
      break;
    }
    wantedLines.push(line.toString());
    lineCounter++;
  }

  return wantedLines;
};

const validateFile = (filename: string) => {
  return doWork(getWantedLines(filename));
};

function doWork(wantedLines: string[]) {
  const firstLine = wantedLines[0];
  delimiter = detectDelimiter(firstLine);
  if (typeof delimiter === 'string') {
    const lines = firstLine.split(delimiter);
    if (lines.length < 5) {
      throw new BadRequestException(
        'File must contain sufficient number of columns',
      );
    }
    const columns = lines.map((column) => {
      column = column.toLocaleLowerCase();
      column = column.replace(/(\r\n|\n|\r)/gm, '');
      return column;
    });

    objectColumns.chr = detectColumn(columns, ['chromosome', 'chr', 'chrom']);
    objectColumns.pos = detectColumn(columns, ['pos', 'bp', 'pos']);
    objectColumns.marker_name = detectColumn(columns, [
      'snp',
      'snpid',
      'markername',
      'rsid',
    ]);
    objectColumns.effect_allele = detectColumn(columns, [
      'a1',
      'effect_allele',
      'allele1',
      'ref',
    ]);
    objectColumns.alternate_allele = detectColumn(columns, [
      'a2',
      'non_effect_allele',
      'allele2',
      'alt',
    ]);
    objectColumns.odds_ratio = detectColumn(columns, ['or', 'odds_ratio']);
    objectColumns.beta = detectColumn(columns, ['beta', 'be', 'b']);
    objectColumns.zscore = detectColumn(columns, ['z', 'zscore']);
    objectColumns.se = detectColumn(columns, ['se']);
    objectColumns.p = detectColumn(columns, [
      'p',
      'pvalue',
      'p_value',
      'pval',
      'p-value',
    ]);
    objectColumns.n = detectColumn(columns, ['n', 'sample_size']);

    const missingColumns = detectMissingColumns(objectColumns);
    const erroredColumns = detectIncorrectColumnContent(
      wantedLines[1].split(delimiter),
      objectColumns,
    );

    if (missingColumns.length !== 0 || erroredColumns.length !== 0) {
      throw new BadRequestException(missingColumns.concat(erroredColumns));
    }
  } else {
    throw new BadRequestException(
      'File must be delimited with either a space, tab or double space',
    );
  }

  return { objectColumns, delimiter };
}

function detectDelimiter(filename: string): string | false {
  const firstLine = getWantedLines(filename)[0];

  let spaceLines = firstLine.split(' ');
  let tabLines = firstLine.split('\t');
  let doubleSpaceLines = firstLine.split('  ');

  if (spaceLines.length > 1) {
    return ' ';
  } else if (tabLines.length > 1) {
    return '\t';
  } else if (doubleSpaceLines.length > 1) {
    return '  ';
  } else {
    return false;
  }
}

function detectColumn(columns: string[], possibleNames: string[]) {
  let columnNumber = -1;

  possibleNames.some((element) => {
    const num = columns.indexOf(element);
    if (num !== -1) {
      columnNumber = num;
    }
    return num !== -1;
  });

  return columnNumber;
}

function detectMissingColumns(objectColumns: Partial<Column>) {
  const missingColumns = [];

  if (objectColumns.chr === -1) {
    missingColumns.push('Missing Column: Chromosome');
  }
  if (objectColumns.marker_name === -1) {
    missingColumns.push('Missing Column: MarkerName');
  }
  if (objectColumns.pos === -1) {
    missingColumns.push('Missing Column: Position');
  }
  if (objectColumns.effect_allele === -1) {
    missingColumns.push('Missing Column: Reference allele');
  }
  if (objectColumns.alternate_allele === -1) {
    missingColumns.push('Missing Column: Alternate allele');
  }
  if (objectColumns.zscore === -1) {
    if (
      objectColumns.p === -1 ||
      objectColumns.beta === -1 ||
      objectColumns.se === -1
    ) {
      missingColumns.push('Missing Column: zscore or (p-value, beta and se) ');
    }
  }

  return missingColumns;
}

function detectIncorrectColumnContent(
  line: string[],
  objectColumns: Partial<Column>,
) {
  const columnErrors = [];

  // if (!isNaN(parseInt(line[objectColumns.chr])) && objectColumns.chr !== -1) {
  //   columnErrors.push('Chromosome column should be a string');
  // }
  if (
    !isNaN(parseInt(line[objectColumns.marker_name])) &&
    objectColumns.marker_name !== -1
  ) {
    columnErrors.push('SNP column should be a string');
  }
  if (
    !isNaN(parseInt(line[objectColumns.effect_allele])) &&
    objectColumns.effect_allele !== -1
  ) {
    columnErrors.push('Ref allele column should be a string');
  }
  if (
    !isNaN(parseInt(line[objectColumns.alternate_allele])) &&
    objectColumns.alternate_allele !== -1
  ) {
    columnErrors.push('Alt allele column should be a string');
  }
  if (
    isNaN(parseFloat(line[objectColumns.p])) &&
    objectColumns.alternate_allele !== -1
  ) {
    columnErrors.push('p-value should be floating point number');
  }
  if (
    isNaN(parseFloat(line[objectColumns.beta])) &&
    objectColumns.beta !== -1
  ) {
    columnErrors.push('beta value should be a floating point number');
  }
  if (
    isNaN(parseFloat(line[objectColumns.zscore])) &&
    objectColumns.zscore !== -1
  ) {
    columnErrors.push('zscore should be a floating point number');
  }
  if (
    isNaN(parseFloat(line[objectColumns.odds_ratio])) &&
    objectColumns.odds_ratio !== -1
  ) {
    columnErrors.push('Odds ratio should be a floating point number');
  }
  if (isNaN(parseFloat(line[objectColumns.se])) && objectColumns.se !== -1) {
    columnErrors.push('standard error should be a floating point number');
  }
  if (isNaN(parseInt(line[objectColumns.pos])) && objectColumns.pos !== -1) {
    columnErrors.push('Position should be an integer');
  }
  if (isNaN(parseInt(line[objectColumns.n])) && objectColumns.n !== -1) {
    columnErrors.push('Sample size should be an integer');
  }
  return columnErrors;
}

export function writeLiftoverFile(
  filename: string,
  output_filename: string,
  objectColumns: Partial<Column>,
) {
  const delimiter = detectDelimiter(filename);

  if (!delimiter) {
    throw new BadRequestException(
      'File must have a tab, space or double space delimiter',
    );
  }

  const readInterface = readline.createInterface(
    fs.createReadStream(filename),
    process.stdout,
    undefined,
    false,
  );

  let stream = fs.createWriteStream(output_filename);

  let lineCounter = 0;

  readInterface.on('line', function (line) {
    let lines = line.replace(/(\r\n|\n|\r)/gm, '');
    let lines_strings = lines.split(delimiter);

    const newFileDelim = '\t';
    const columnNumbers = range(0, lines_strings.length);
    const main = [
      objectColumns.chr,
      objectColumns.pos,
      objectColumns.marker_name,
    ];

    const remCols = columnNumbers.filter(x => !main.includes(x));

    if (lineCounter === 0) {
      stream.write(
        `chr${delimiter}pos${delimiter}rsid${delimiter}${remCols
          .map((value) => lines_strings[value])
          .join(newFileDelim)}\n`,
      );
    } else {
      stream.write(
        `${lines_strings[objectColumns.chr].replace('chr', '')}${newFileDelim}${
          lines_strings[objectColumns.pos]
        }${newFileDelim}${
          lines_strings[objectColumns.marker_name]
        }${newFileDelim}${remCols
          .map((value) => lines_strings[value])
          .join(newFileDelim)}\n`,
      );
    }
    lineCounter++;
  });

  readInterface.on('close', function () {
    stream.end();
  });
}

function range(start: number, end: number): number[] {
  let list = [];
  for (let i = start; i <= end - 1; i++) {
    list.push(i);
  }
  return list;
}

export default validateFile;
