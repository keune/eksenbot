module.exports = {
  sleep: (ms) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(() => null), ms);
    });
  },

  propositionCase: (str) => {
    const smalls = ['a', 'and', 'is', 'of', 'on', 'in', 'at', 'the', 'by'];

    smalls.forEach((small) => {
      const pattern = new RegExp(`\\b(?!^)${small}\\b`, 'gi');
      str = str.replace(pattern, small);
    });

    return str;
  },

  toTitleCase: (str) => {
    return str.split(' ').map((s) => {
      s = s.toLocaleLowerCase();
      return s[0].toLocaleUpperCase() + s.slice(1);
    }).join(' ');
  },

  d: (...args) => {
    console.log(...args);
  },

  dd: (...args) => {
    console.log(...args);
    process.exit();
  },
};
