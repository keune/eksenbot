export const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(() => null), ms);
  });
};

export const propositionCase = (str) => {
  const smalls = ['a', 'and', 'is', 'of', 'on', 'in', 'at', 'the', 'by'];

  smalls.forEach((small) => {
    const pattern = new RegExp(`\\b(?!^)${small}\\b`, 'gi');
    str = str.replace(pattern, small);
  });

  return str;
};

export const toTitleCase = (str) => {
  return str.split(' ').map((s) => {
    const lc = s.toLocaleLowerCase();
    return lc[0].toLocaleUpperCase() + lc.slice(1);
  }).join(' ');
};

export const d = (...args) => {
  console.log(...args);
};

export const dd = (...args) => {
  console.log(...args);
  process.exit();
};