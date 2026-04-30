export const dict = {
  en: {
    app: {
      title: 'Climb-Craft',
      version: 'v1.0.0'
    },
    sidebar: {
      title: 'Parts Library',
      pointer: {
        name: 'Select / Orbit',
        desc: 'Click to select, drag to rotate view'
      },
      pipeLong: {
        name: 'Pipe (350mm)',
        desc: 'For 350mm long tubes'
      },
      pipeMedium: {
        name: 'Pipe (250mm)',
        desc: 'For 250mm medium tubes'
      },
      pipeShort: {
        name: 'Pipe (150mm)',
        desc: 'For 150mm short tubes'
      },
      panelLarge: {
        name: 'Panel (40x40cm)',
        desc: 'Large board for platforms'
      },
      panelSmall: {
        name: 'Panel (40x20cm)',
        desc: 'Small board for barriers'
      }
    },
    inventory: {
      title: 'Bill of Materials',
      pipe: 'Pipe',
      panel: 'Panel',
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
      empty: 'No parts placed yet.',
      stockSection: 'From Stock (no cost)',
      excessSection: 'To Purchase',
      excessLabel: 'Pricing'
    },
    priceTag: {
      title: 'Estimated Cost',
      currency: '$'
    },
    toast: {
      notOnAxis: 'Not aligned on the same axis!',
      notSameLevel: 'Not on the same horizontal plane!',
      lengthMismatch: (expected: number, actual: number) =>
        `Tube length mismatch (expected span ${expected}, but target distance is ${actual})!`,
      collision: 'Path blocked by existing structure!',
    },
    button: {
      centerView: 'Center View',
      deletePipe: 'Remove Tube (Del)',
      deletePanel: 'Remove Panel (Del)',
    },
    projectManager: {
      title: 'Local Design Library',
      placeholder: 'Enter design name...',
      saveAsNew: 'Save as New',
      history: 'Saved Designs',
      empty: 'No saved designs yet.',
      lastModified: 'Last modified',
      overwrite: 'Overwrite this draft with current state',
      load: 'Load this draft',
      delete: 'Delete this draft',
      confirmDelete: 'Delete this design draft?',
      confirmClear: 'Clear current scene? Unsaved progress will be lost.',
      clearScene: 'Clear Current Scene',
    },
    inventorySettings: {
      title: 'Inventory & Cost Settings',
      stockQuota: 'Stock:',
      unitPrice: 'Unit Price',
      cancel: 'Cancel',
      save: 'Save & Apply',
    },
    feedback: {
      open: 'Report Issue',
      title: 'Report Issue',
      descriptionLabel: 'What went wrong?',
      descriptionPlaceholder: 'e.g., error when placing a pipe, display glitch, unresponsive controls...',
      emailLabel: 'Email (optional)',
      emailPlaceholder: 'So we can reply to you',
      autoAttachments: 'Attached information',
      includeLogs: 'Operation logs',
      includeDeviceInfo: 'Browser & device info',
      includeSnapshot: 'Design scene snapshot',
      privacyNotice: 'By submitting you agree to let us use this information to investigate the issue. We will not use it for any other purpose.',
      cancel: 'Cancel',
      submit: 'Submit',
      submitting: 'Sending...',
      successMessage: 'Thank you! Your feedback has been submitted.',
      errorMessage: 'Submission failed. Please try again.',
      retry: 'Retry',
      logHistory: 'Operation History',
      logEmpty: 'No operations recorded yet',
      showLogs: 'Show logs',
      hideLogs: 'Hide logs',
      colTime: 'Time',
      colAction: 'Action',
      colResult: 'Result',
      colReason: 'Reason',
      charCount: (used: number, max: number) => `${used} / ${max}`,
    },
  },
  zh: {
    app: {
      title: 'Climb-Craft',
      version: 'v1.0.0'
    },
    sidebar: {
      title: '零件库',
      pointer: {
        name: '选择 / 视角',
        desc: '点击选择零件，拖拽旋转视角'
      },
      pipeLong: {
        name: '长管 (350mm)',
        desc: '适合 350mm 长管'
      },
      pipeMedium: {
        name: '中管 (250mm)',
        desc: '适合 250mm 中管'
      },
      pipeShort: {
        name: '短管 (150mm)',
        desc: '适合 150mm 短管'
      },
      panelLarge: {
        name: '大面板 (40x40cm)',
        desc: '40x40cm 大面板，用于平台'
      },
      panelSmall: {
        name: '小面板 (40x20cm)',
        desc: '40x20cm 小面板，用于围挡'
      }
    },
    inventory: {
      title: '物料清单 (BOM)',
      pipe: '管子',
      panel: '面板',
      connectors: {
        '3WAY': '三通',
        '4WAY': '四通',
        '5WAY': '五通',
        '6WAY': '六通',
        'L': 'L通',
        'T': 'T通',
        'STRAIGHT': '一字通',
        'UNKNOWN': '未定型',
      },
      empty: '暂未放置任何零件。',
      stockSection: '消耗自有库存 (无成本)',
      excessSection: '需新购零件 (超限)',
      excessLabel: '计价单'
    },
    priceTag: {
      title: '预估总造价',
      currency: '¥'
    },
    toast: {
      notOnAxis: '未在同一条轴线上，无法接上！',
      notSameLevel: '不在同一个水平面或未精确对齐，无法接上！',
      lengthMismatch: (expected: number, actual: number) =>
        `管子长度不匹配（当前管子跨度为 ${expected}，但目标距离跨度为 ${actual}），无法接上！`,
      collision: '连线路径上存在遮挡碰撞，无法接上！',
    },
    button: {
      centerView: '回到中心 (Center View)',
      deletePipe: '拆除当前管路 (Del)',
      deletePanel: '拆除当前面板 (Del)',
    },
    projectManager: {
      title: '本地设计库',
      placeholder: '输入新设计稿名称...',
      saveAsNew: '保存为新草稿',
      history: '历史草稿清单',
      empty: '暂无保存的设计稿',
      lastModified: '最后修改',
      overwrite: '用当前界面状态覆盖此草稿',
      load: '载入此草稿',
      delete: '删除此草稿',
      confirmDelete: '确定要删除该设计草稿吗？',
      confirmClear: '确定要清空当前场景吗？未保存的进度将丢失。',
      clearScene: '清空当前场景',
    },
    inventorySettings: {
      title: '库存与成本设定',
      stockQuota: '库存额度:',
      unitPrice: '单价',
      cancel: '取消',
      save: '保存并应用',
    },
    feedback: {
      open: '问题反馈',
      title: '问题反馈',
      descriptionLabel: '描述你遇到的问题',
      descriptionPlaceholder: '请描述你遇到的问题...',
      emailLabel: '邮箱（选填）',
      emailPlaceholder: '方便我们回复你',
      autoAttachments: '自动附带的信息',
      includeLogs: '操作日志',
      includeDeviceInfo: '浏览器与设备信息',
      includeSnapshot: '当前设计场景快照',
      privacyNotice: '提交即表示你同意我们使用上述信息排查问题。我们不会将这些信息用于其他用途。',
      cancel: '取消',
      submit: '发送反馈',
      submitting: '发送中...',
      successMessage: '反馈已提交，感谢！',
      errorMessage: '发送失败，请重试。',
      retry: '重试',
      logHistory: '操作记录',
      logEmpty: '暂无操作记录',
      showLogs: '展开日志',
      hideLogs: '收起日志',
      colTime: '时间',
      colAction: '操作',
      colResult: '结果',
      colReason: '原因',
      charCount: (used: number, max: number) => `${used} / ${max}`,
    },
  }
} as const;

export type Language = keyof typeof dict;
