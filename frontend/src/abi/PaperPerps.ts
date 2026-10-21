export const PAPER_PERPS_ABI = [
  {
    "type": "function",
    "name": "MAX_LEVERAGE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_LEVERAGE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "closePosition",
    "inputs": [
      {
        "name": "perpIndex",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "outputs": [
      {
        "name": "pnlUsd6",
        "type": "int256",
        "internalType": "int256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getHistory",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct PaperPerps.TradeRecord[]",
        "components": [
          {
            "name": "perpIndex",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "isLong",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "liquidated",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "leverage",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "entryPrice",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "exitPrice",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "closedAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "marginUsd6",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "pnlUsd6",
            "type": "int256",
            "internalType": "int256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getMarkPrice",
    "inputs": [
      {
        "name": "perpIndex",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "historyAt",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct PaperPerps.TradeRecord",
        "components": [
          {
            "name": "perpIndex",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "isLong",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "liquidated",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "leverage",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "entryPrice",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "exitPrice",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "closedAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "marginUsd6",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "pnlUsd6",
            "type": "int256",
            "internalType": "int256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "historyLength",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "leaderboard",
    "inputs": [
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "limit",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "traders",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "pnls",
        "type": "int256[]",
        "internalType": "int256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "openPosition",
    "inputs": [
      {
        "name": "perpIndex",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "isLong",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "marginUsd6",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "leverage",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "positions",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "outputs": [
      {
        "name": "open",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "isLong",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "perpIndex",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "leverage",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "entryPrice",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "openedAt",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "marginUsd6",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "notionalUsd6",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "previewEquity",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "perpIndex",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "outputs": [
      {
        "name": "open",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "pnlUsd6",
        "type": "int256",
        "internalType": "int256"
      },
      {
        "name": "equityUsd6",
        "type": "int256",
        "internalType": "int256"
      },
      {
        "name": "markPrice",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalPnlUsd6",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "int256",
        "internalType": "int256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "traderCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "PositionClosed",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "perpIndex",
        "type": "uint16",
        "indexed": true,
        "internalType": "uint16"
      },
      {
        "name": "exitPrice",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "pnlUsd6",
        "type": "int256",
        "indexed": false,
        "internalType": "int256"
      },
      {
        "name": "marginUsd6",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PositionIncreased",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "perpIndex",
        "type": "uint16",
        "indexed": true,
        "internalType": "uint16"
      },
      {
        "name": "addedMarginUsd6",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "newLeverage",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "newEntryPrice",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "newNotionalUsd6",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PositionLiquidated",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "perpIndex",
        "type": "uint16",
        "indexed": true,
        "internalType": "uint16"
      },
      {
        "name": "markPriceAtLiquidation",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "marginLostUsd6",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PositionOpened",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "perpIndex",
        "type": "uint16",
        "indexed": true,
        "internalType": "uint16"
      },
      {
        "name": "isLong",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "marginUsd6",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "leverage",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "entryPrice",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "InvalidLeverage",
    "inputs": [
      {
        "name": "leverage",
        "type": "uint32",
        "internalType": "uint32"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidMargin",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoOpenPosition",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PositionDirectionMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PrecompileCallFailed",
    "inputs": [
      {
        "name": "target",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroPrice",
    "inputs": []
  }
] as const;
