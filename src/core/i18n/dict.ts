export const dict = {
  en: {
    app: {
      title: 'Climb-Craft',
      version: 'v1.0.0'
    },
    sidebar: {
      title: 'Parts Library',
      pipeLong: {
        name: 'Pipe (350mm)',
        desc: 'Long tube, 8 LU span'
      },
      pipeMedium: {
        name: 'Pipe (250mm)',
        desc: 'Medium tube, 6 LU span'
      },
      pipeShort: {
        name: 'Pipe (150mm)',
        desc: 'Short tube, 4 LU span'
      }
    },
    inventory: {
      title: 'Bill of Materials',
      pipe: 'Pipe',
      connectors: {
        '3WAY': '3-Way Connector',
        '4WAY': '4-Way Connector',
        '5WAY': '5-Way Connector',
        '6WAY': '6-Way Connector',
        'L': 'L-Shape Connector',
        'T': 'T-Shape Connector',
        'STRAIGHT': 'Straight Connector',
        'UNKNOWN': 'Unresolved Connector',
      },
      empty: 'No parts placed yet.'
    },
    priceTag: {
      title: 'Estimated Cost',
      currency: '$'
    }
  },
  zh: {
    app: {
      title: 'Climb-Craft',
      version: 'v1.0.0'
    },
    sidebar: {
      title: '零件库',
      pipeLong: {
        name: '长管 (350mm)',
        desc: '逻辑跨度 8 LU'
      },
      pipeMedium: {
        name: '中管 (250mm)',
        desc: '逻辑跨度 6 LU'
      },
      pipeShort: {
        name: '短管 (150mm)',
        desc: '逻辑跨度 4 LU'
      }
    },
    inventory: {
      title: '物料清单 (BOM)',
      pipe: '管子',
      connectors: {
        '3WAY': '三通接头',
        '4WAY': '四通接头',
        '5WAY': '五通接头',
        '6WAY': '六通接头',
        'L': 'L通(直角)接头',
        'T': 'T通接头',
        'STRAIGHT': '一字(直线)接头',
        'UNKNOWN': '未定型接头',
      },
      empty: '暂未放置任何零件。'
    },
    priceTag: {
      title: '预估总造价',
      currency: '¥'
    }
  }
} as const;

export type Language = keyof typeof dict;
