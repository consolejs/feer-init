/* eslint-disable */

const appConfig = require("./app"); // 本地配置
const {
  projectName,
  jsFilename
} = appConfig || {};

var fs = require('fs');

const path = require("path");

import postcss from 'rollup-plugin-postcss';
import babel from 'rollup-plugin-babel'; //提供 Babel 能力, 需要安装和配置 Babel 
import resolve from 'rollup-plugin-node-resolve'; //解析 node_modules 中的模块
import commonjs from 'rollup-plugin-commonjs'; //转换 CJS -> ESM, 通常配合上面一个插件使用
import filesize from 'rollup-plugin-filesize'; //显示 bundle 文件大小
import jscc from 'rollup-plugin-jscc'; //Rollup的条件编译和编译时变量替换
import livereload from 'rollup-plugin-livereload'; //热更新
import { eslint } from 'rollup-plugin-eslint'; //提供 ESLint 能力, 需要安装和配置 ESLint 
import { string } from 'rollup-plugin-string'; //将html转为js模板
import { uglify } from 'rollup-plugin-uglify'; // 压缩 bundle 文件

import replace from '@rollup/plugin-replace'; //类比 Webpack 的 DefinePlugin , 可在源码中通过 process.env.NODE_ENV 用于构建区分Development 与 Production 环境.
import copy from 'rollup-plugin-copy';
import multiInput from 'rollup-plugin-multi-input'; //多入口汇总输出插件
import outputManifest from 'rollup-plugin-output-manifest';//生成mainfest.json

const {
  DEV,
  BUILD
} = process.env;

//随机产生区间数字，如 300~500
function getRandomArbitrary(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function getRandom(n = 6) {
  const numer = '0123456789';
  const lowerCaseletter = 'abcdefghijklmnopqrstuvwxyz';
  let chars = numer + lowerCaseletter;
  /***可以自行添加容易混淆的字符Ko32,3hJz,Po2a***/
  let maxPos = chars.length;
  let code = '';
  for (let i = 0; i < n; i++) {
    code += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return code
}

//自定义输出css路径
const cssPath = BUILD ? 'build/css/index.css' : '.temp/css/index.css';

const targetObj = {};
const getCssHashVal = getRandom(8);

const sharedObj = {
  input: 'src/*.js',
  output: {
    projectName,
    dir: BUILD ? 'build/js/' : '.temp/js/',
    format: 'cjs',
    entryFileNames: BUILD ? '[name].[hash].js' : '[name].js',
    extend: true,
    minify: true,
    globals: {
      jquery: '$'
    },
    sourcemap: BUILD ? false : 'inline'
  },
  external: ['jquery'],
  plugins: [
    replace({
      "__buildDate__": () => JSON.stringify(new Date().toLocaleString()),
      // __buildVersion: 15,
      'process.env.NODE_ENV': JSON.stringify(DEV ? "development" : "production")
    }),
    multiInput({
      relative: 'src/'
    }),
    jscc(),
    postcss({
      extract: cssPath,
      minimize: {
        reduceIdents: false
      },
      sourceMap: BUILD ? false : 'inline'
    }),
    string({
      include: '**/*.html'
    }),
    BUILD || DEV ?
    copy({
      targets: [{ // 若不使用本地图片,可改为cdn地址
        src: ['images/*', '!images/sprite'],
        dest: BUILD ? 'build/img/' : '.temp/img/'
      }]
    }) :
    null,
    babel({
      exclude: 'node_modules/**'
    }),
    commonjs(),
    resolve(),
    eslint({
      exclude: ['src/**'],
      fix: true, // Auto fix source code
      throwOnError: true // Throw an error if any errors were found
    }),
    BUILD ?
    null :
    livereload({
      port: getRandomArbitrary(3e4, 5e4), //随机占用一个端口
      watch: ['views/', '.temp/'] //监听文件夹;
    }),
    BUILD ?
    uglify({
      ie8: true,
      compress: {
        drop_debugger: true,
        drop_console: false, // 移除console
        // pure_funcs: ['console.log'] // 也可：移除console等
      },
    }) :
    null,
    filesize(),
    BUILD ? outputManifest({
      generate: (keyValueDecorator, seed) => chunks =>
        chunks.reduce((json, chunk) => {
          const {
            name,
            fileName
          } = chunk;
          // console.log(11111, name, fileName, {
          //   ...json,
          //   ...keyValueDecorator(name, fileName)
          // });
          // css文件生成hash值
          fs.rename(path.resolve("build/css/index.css"), path.resolve(`build/css/index.${getCssHashVal}.css`), function (err) {
            if (err) console.log('ERROR: ' + err);
          });
          const cssObj = {
            'index.css': `index.${getCssHashVal}.css`
          }
          const newObj = Object.assign(targetObj, {
            ...cssObj,
            ...json,
            ...keyValueDecorator(name, fileName)
          })
          return newObj;
        }, seed)
    }) : null
  ],
  watch: {
    exclude: ['node_modules/**']
  }
}


// 通过配置中心的js文件名称，处理为任务数组，作分别打包使用
const getTargetTask = (jsFiles) => {
  const tasks = [];
  jsFiles.map((file) => {
    tasks.push(Object.assign({}, sharedObj, {
      input: `src/${file}.js`
    }))
  })
  return tasks
}

// 获取任务列表
const taskArray = getTargetTask(jsFilename);

export default taskArray
