// 全局类型声明文件
// 用于解决Next.js 14和React 18的类型兼容性问题

declare module 'react' {
  interface ReactNode {
    // 扩展ReactNode类型以兼容Next.js 14
  }
}

// 声明所有组件都可以作为JSX元素使用
declare global {
  namespace JSX {
    interface Element {
      // 允许任何组件作为JSX元素
    }
  }
}

export {};
