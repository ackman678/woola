#!/usr/bin/env node
const http = require('http')
const open = require('open')
const connect = require('connect')
const path = require('path')
const fs = require('fs')
const micromatch = require('micromatch')
const send = require('send')
const jsdom = require('jsdom')
const openPort = require('openport')
const flags = require('commander')
const ansi = require('ansi')
const cursor = ansi(process.stdout)

const mdparse = require('./mdparse.js')
const watch = require('./watch.js')
const sync = require('./sync.js')
const writepdf = require('./writepdf.js')
const pkg = require('../package.json')

// Options
flags.version(pkg.version)
  .option('-d, --dir [type]', 'Serve from directory [dir]', './')
  .option('-p, --port [type]', 'Serve on port [port]', null)
  .option('-h, --header [type]', 'Header .md file', null)
  .option('-r, --footer [type]', 'Footer .md file', null)
  .option('-n, --navigation [type]', 'Navigation .md file', null)
  .option('-a, --address [type]', 'Serve on ip/address [address]', 'localhost')
  .option('-s, --css [type]', 'Path to css styles [css]', './css/build/main.min.css')
  .option('-f, --file [type]', 'Open specific file in browser [file]')
  .option('-x, --x', 'Don\'t open browser on run.')
  .option('-v, --verbose', 'verbose output')
  .parse(process.argv)

const baseDir = flags.dir
const rootDir = process.cwd()
const cssStyleData = flags.css
const PORT_RANGE = {
  HTTP: [8000, 8100]
}

// Terminal Output Messages
const msg = (type) => cursor
  .bg.green()
  .fg.black()
  .write(' server.js ')
  .reset()
  .fg.white()
  .write(' ' + type + ': ')
  .reset()

const errormsg = (type) => cursor
  .bg.red()
  .fg.black()
  .write(' server.js ')
  .reset()
  .write(' ')
  .fg.black()
  .bg.red()
  .write(' ' + type + ': ')
  .reset()
  .fg.red()
  .write(' ')

var siteConfig = null
try {
  siteConfig = require(path.resolve(process.cwd(),'./config.js'))
  siteConfig.time = new Date() 
} catch (err) {
  errormsg('warning')
    .write('./config.js not found in current dir', err)
    .reset().write('\n')
}

const markdownExtensions = (siteConfig) => {
  try {
    return ( siteConfig.options.extFilter.map(x => { return path.parse(x).ext }) )
  } catch (err) {
   return ( [ '.markdown', '.md', '.mmd', '.txt' ] )
  }
}

const watchConfig = {
  MarkconfDefaults: {
    watch: {}
  }
}

try {
  watchConfig.MarkconfDefaults.watch.ignore = siteConfig.options.ignore
} catch (err) {
  watchConfig.MarkconfDefaults.watch.ignore = ['.DS_Store', '.git', '.gitignore', 'node_modules']
}
const watcher = watch(watchConfig)


// getFile: reads utf8 content from a file
const getFile = (fileName) => new Promise((resolve, reject) => {
  fs.readFile(fileName, 'utf8', (err, data) => {
    if (err) reject(err)
    resolve(data)
  })
})

// hasMarkdownExtension: check whether a file is Markdown type
const hasMarkdownExtension = (fileName) => {
  const fileExtension = path.extname(fileName).toLowerCase()
  let extensionMatch = false
  const mdExtList = markdownExtensions(siteConfig)
  mdExtList.forEach(extension => {
    if (extension === fileExtension) {
      extensionMatch = true
      }
    })
  return extensionMatch
}

// // Get Custom Less CSS to use in all Markdown files
// const buildStyleSheet = (lessStyleData) => new Promise(resolve => {
//     less.render(lessStyleData)
//       .then( data => resolve(data.css) )
//       .catch (err => { console.log(err) })
//   })

// markdownToHTML: turns a Markdown file into HTML content
const markdownToHTML = (data, fileName) => new Promise(resolve => {
  resolve(mdparse(data, fileName, false))
})

// linkify: converts github style wiki markdown links to .md links
const linkify = (page) => new Promise((resolve, reject) => {  
  jsdom.env(page.content, (err, window) => {
    if (err) {
      return reject(err)
    }

    const links = window.document.getElementsByTagName('a')
    const l = links.length

    let href
    let link
    let markdownFile
    let mdFileExists
    let relativeURL
    let isFileHref

    for (let i = 0; i < l; i++) {
      link = links[i]
      href = link.href
      isFileHref = href.substr(0, 8) === 'file:///'

      markdownFile = href.replace(path.join('file://', __dirname), baseDir) + '.md'
      mdFileExists = fs.existsSync(markdownFile)

      if (isFileHref && mdFileExists) {
        relativeURL = href.replace(path.join('file://', __dirname), '') + '.md'
        link.href = relativeURL
      }
    }

    page.content = window.document.getElementsByTagName('body')[0].innerHTML

    resolve(page)
  })
})


// ---begin main build function---
// buildHTMLFromMarkDown: compiles the final HTML/CSS output from Markdown/Less files, includes JS
const buildHTMLFromMarkDown = (fileName, query) => new Promise(resolve => {

  const stack = [
    getFile(cssStyleData),

    // Article
    getFile(fileName)
      .then(data => { return markdownToHTML(data, fileName) })
      .then(linkify),

    // Header
    flags.header && getFile(flags.header)
      .then(data => { return markdownToHTML(data, fileName) })
      .then(linkify),

    // Footer
    flags.footer && getFile(flags.footer)
      .then(data => { return markdownToHTML(data, fileName) })
      .then(linkify),

    // Navigation
    flags.navigation && getFile(flags.navigation)
      .then(data => { return markdownToHTML(data, fileName) })
      .then(linkify)
  ]

  Promise.all(stack).then(dataArr => {
    const css = dataArr[0]
    // console.log(dataArr[1])
    const page = dataArr[1]
    const dirs = fileName.split('/')
    
    console.log(

`title: ${page.title}
url: ${page.url}
tags: ${page.tags}
date: ${page.date}
author: ${page.author}`)

    let dropMenuhtml
    if (query === 'pdf') {
      dropMenuhtml = ''
    } else {
      const dropMenu = {
        pdf: fileName.slice(2) + '?pdf'
      }
      dropMenuhtml = (

// <-- template literal block
`<div class="btn-group">
  <button type="button" onclick="menuToggle()" id="dropmenubutton" class="btn btn-xs btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" tabindex="-1">
    <span class="glyphicon glyphicon-menu-hamburger"></span>
  </button>

  <ul class="dropdown-menu" id="dropmenu" role="menu" tabindex="-1" >
    <li><a href="${dropMenu.pdf}"><span class="glyphicon glyphicon-print"></span> pdf</a></li>
    <li role="separator" class="divider"></li>
  </ul>
</div>`)

    }

    let header
    let footer
    let navigation
    let outputHtml

    if (flags.header) {
      header = dataArr[2]
    }

    if (flags.footer) {
      footer = dataArr[3]
    }

    if (flags.navigation) {
      navigation = dataArr[4]
    }

    //setup html and document body
    outputHtml = (

// <-- template literal block
`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${page.title}</title>
  <meta name="description" content="${page.tags}">
  <meta name="author" content="${page.author}">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.7.1/katex.min.css" async>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/styles/github-gist.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/highlight.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/languages/matlab.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/languages/r.min.js"></script>

  <style>
    ${css}
  </style>

  <script>
    function buildMenu() {
      const menuDiv = document.getElementById("dropmenu")
      if ( menuDiv != null && menuDiv.children.length > 0 && menuDiv.children.length < 3 ) {
        const list = document.querySelectorAll("h1, h2, h3, h4")
        let innerText = ''
        list.forEach(item => {
          const currLev = item.tagName.toLowerCase()
          const node = document.createElement("li")
          node.setAttribute("class","dropmenulink")
          const ref = document.createElement("a")
          ref.setAttribute("href","#" + item.id)
          if (currLev === 'h1') {
            innerText = item.textContent
          } else if (currLev === 'h2') {
            innerText = "\xA0\xA0" + item.textContent
          } else if (currLev === 'h3') {
            innerText = "\xA0\xA0\xA0\xA0" + item.textContent
          } else {
            innerText = "\xA0\xA0\xA0\xA0\xA0\xA0" + item.textContent
          }
          const textnode = document.createTextNode(innerText)
          ref.appendChild(textnode)
          node.appendChild(ref)
          document.getElementById("dropmenu").appendChild(node)
        })
        // menuDiv.addEventListener('click', menuToggle, false)
        menuDiv.addEventListener('keydown', onMenuKeyDown, false)
      }
      document.addEventListener('keydown', onDocumentKeyDown, false)
    }
  
    function onDocumentKeyDown(event) {
      switch(event.which){
        case 77:
          menuToggle()
          // event.preventDefault()
        break

        case 27:          
          menuToggle()
          // event.preventDefault()
        break
      }  
    }

    function onMenuKeyDown(event) {
      const menuDiv = document.getElementById("dropmenu")
      const menuList = menuDiv.querySelectorAll(".dropmenulink")
      if (menuList) {
        //skip between top and botttom menu items with up and down arrow keys
        switch (event.which) {
          case 38:
            menuList[0].firstElementChild.focus()
          break

          case 40:          
            menuList[menuList.length-1].firstElementChild.focus()
          break
        } 
      } 
    }

    function menuToggle() {
      const menuDiv = document.getElementById("dropmenu")
      menuDiv.classList.toggle('show')
      // menuDiv.lastElementChild.firstElementChild.focus()
      const menuItem = menuDiv.querySelector(".dropmenulink")
      if (menuItem) { menuItem.firstElementChild.focus() }
      if (!menuDiv.classList.contains("show")) {
        document.getElementById("dropmenubutton").blur()
      }
    }

    window.onload = buildMenu
  </script>

</head>
<body>
  ${dropMenuhtml}
  <article class="markdown-body">
  ${page.content}
  </article>
</body>
<script>hljs.initHighlightingOnLoad()</script>
</html>`)

    resolve(outputHtml)
  })
  .catch (err => { console.log(err) })
})
// ---end main build---



// Create pdf file and save locally on server...
const printPDF = (fileName, res, query) => buildHTMLFromMarkDown(fileName, query)
  .then(html => {
    res.writeHead(200)
    res.end(html)
    const outFile = path.join(path.parse(fileName).dir, path.parse(fileName).name + '.pdf')
    try {
      writepdf(html, outFile, siteConfig.pdfconfig[siteConfig.pdfconfig.use])
    } catch (err) {
      console.log('No default pdfconfig.use value found...')
      writepdf(html, outFile)
    }
  })
  .catch (err => {
    msg('error')
    .write('Can\'t print pdf: ', err)
    .reset().write('\n')
  })

// Begin markdown compilation process, then send result when done...
const compileAndSendMarkdown = (fileName, res, query) => buildHTMLFromMarkDown(fileName, query)
  .then(html => {
    res.writeHead(200)
    res.end(html)
  })
  .catch (err => {
    msg('error')
    .write('Can\'t build HTML: ', err)
    .reset().write('\n')
  })

//setup list object for initial directory index listing
const compileAndSendDirectoryListing = (fileName, res) => {
  const excludeList = watchConfig.MarkconfDefaults.watch.ignore
  const urls = fs.readdirSync(fileName)
  let list = '\n    <ul>\n'

  urls.forEach(subPath => {
    const isDir = fs.statSync(fileName + subPath).isDirectory()
    let href
    if ( isDir && !excludeList.includes(path.parse(subPath).base) ) {
      href = subPath + '/'
      list += `    <li class="dir"><a href="${href}">${href}</a></li> \n`
    } else {
      href = subPath
      if (subPath.split('.md')[1] === '') {
        list += `    <li class="md"><a href="${href}">${href}</a></li> \n`
      } else if ( !excludeList.includes(path.parse(subPath).base) ) {
        list += `    <li class="file"><a href="${href}">${href}</a></li> \n`
      }
    }
  })
  list += '    </ul>\n'

  //setup template literal for initial directory listing
  getFile(cssStyleData)
    .then( css => {
      const html = (

`<!DOCTYPE html>
<html>
<head>
  <title>${fileName.slice(2)}</title>
  <meta charset="utf-8">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.7.1/katex.min.css" async />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/styles/github-gist.min.css" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/highlight.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/languages/matlab.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/languages/r.min.js"></script>
  <link rel="shortcut icon" type="image/x-icon" href="https://cdn0.iconfinder.com/data/icons/octicons/1024/markdown-128.png" />
  <style>
    ${css}
  </style>
</head>
<body>
  <article class="markdown-body">
    <h1>Index of ${fileName.slice(2)}</h1>
    ${list}
  </article>
</body>
</html>`

    )

    // Log if verbose
    if (flags.verbose) {
      msg('index').write(fileName).reset().write('\n')
    }

    // Send file
    res.writeHead(200, {'Content-Type': 'text/html'})
    res.write(html)
    res.end()
  })
  .catch (err => { 
    console.log(err)
    console.log('The cwd is ' + process.cwd())
  })
}

// Remove URL params from file being fetched
const getPathFromUrl = url => {
  return url.split(/[?#]/)[0]
}


// http_request_handler: handles all the browser requests
const httpRequestHandler = (req, res) => {
  const originalUrl = getPathFromUrl(req.originalUrl)
  const query = req.originalUrl.split(/[?]/)[1]

  if (flags.verbose) {
    msg('request')
     .write(decodeURI(baseDir) + decodeURI(originalUrl))
     .reset().write('\n')
  }

  const fileName = decodeURI(baseDir) + decodeURI(originalUrl)

  try {
    // Test what filetype the browser is requesting
    const isDir = fs.statSync(fileName).isDirectory()
    const isMarkdown = hasMarkdownExtension(fileName)
    
    if (query === 'pdf') {
      printPDF(fileName, res, query)
    } else if ( isMarkdown ) {
      msg('markdown').write(fileName.slice(2)).reset().write('\n')
      compileAndSendMarkdown(fileName, res, query)
    } else if ( isDir ) {
      // Index: Browser is requesting a Directory Index
      msg('dir').write(fileName.slice(2)).reset().write('\n')
      compileAndSendDirectoryListing(fileName, res)
    } else {
      // Other: Browser requests other MIME typed file (handled by 'send')
      msg('file').write(fileName.slice(2)).reset().write('\n')
      send(req, fileName).pipe(res)
      // send(req, fileName, {root: dir}).pipe(res)
    }    
  } catch (err) {
    res.writeHead(200, {'Content-Type': 'text/html'})
    errormsg('404').write(fileName.slice(2)).reset().write('\n')
    res.write('404 :\'(')
    res.end()
    return
  }
}

let HTTP_PORT
let CONNECT_APP

const findOpenPort = range => new Promise((resolve, reject) => {
  const props = {
    startingPort: range[0],
    endingPort: range[1]
  }

  openPort.find(props, (err, port) => {
    if (err) {
      return reject(err)
    }
    resolve(port)
  })
})




// ---define the connect app promise and its four primary promise children---
const startConnectApp = () => new Promise(resolve => {
  CONNECT_APP = connect()
    .use('/', httpRequestHandler)
  resolve(CONNECT_APP)
})


const setHTTPPort = port => new Promise(resolve => {
  HTTP_PORT = port
  resolve(port)
})


const startHTTPServer = () => new Promise(resolve => {
  const HTTP_SERVER = http.createServer(CONNECT_APP)
  HTTP_SERVER.listen(HTTP_PORT, flags.address)
  resolve(HTTP_SERVER)
})


const startLiveReloadServer = () => new Promise(resolve => {

  //logLevel: info, debug, silent
  const syncConfig = {
    logPrefix: 'Browsersync',
    port: HTTP_PORT,
    proxy: 'localhost:' + HTTP_PORT,
    open: false,
    logLevel: 'info',
    notify: false
  }

  sync.start(syncConfig)

  const watchList = []

  const watchExtensions = markdownExtensions(siteConfig) 
  watchExtensions.map(x => { return ('**/*'+x) })
  watchExtensions.push('**/*.html')

  if (watchExtensions) {
    watchExtensions.forEach(filePattern => {
        watchList.push(path.join(rootDir, filePattern))
    })
  }

  const handleChanges = (changedFile, changeType) => {
    const shortPattern = path.relative(rootDir, changedFile)
    const changed = micromatch(changedFile, watchList).length > 0

    console.log(changedFile)
    console.log(shortPattern)
    console.log(changed)

    if (changed) {
      // log.info(`Watch: found ${log.hl('files')} rule ${log.hl(shortPattern)} for: ${log.hl(changeType)} ${log.ul(changedFile)}`)
      sync.reload(changedFile)
    } else {
      // log.trace(`Watch: found no rule for: ${log.hl(changeType)} ${log.ul(changedFile)}`)
      console.log('Watch: found no rule')
    }
  }

  const watchDirs = []
  watchDirs.push(rootDir)
  watcher.create(watchDirs, handleChanges)
  resolve(syncConfig)
})


const serversActivated = () => {
  const serveURL = 'http://' + flags.address + ':' + HTTP_PORT

  msg('start')
   .write('serving content from ')
   .fg.white().write(path.resolve(baseDir)).reset()
   .write(' on port: ')
   .fg.white().write(String(HTTP_PORT)).reset()
   .write('\n')

  msg('address')
   .underline().fg.white()
   .write(serveURL).reset()
   .write('\n')

  msg('css')
   .write('using style from ')
   .fg.white().write(flags.css).reset()
   .write('\n')

  if (process.pid) {
    msg('process')
      .write('your pid is: ')
      .fg.white().write(String(process.pid)).reset()
      .write('\n')

    msg('info')
      .write('to stop this server, press: ')
      .fg.white().write('[Ctrl + C]').reset()
      .write(', or type: ')
      .fg.white().write('"kill ' + process.pid + '"').reset()
      .write('\n')
  }

  if (flags.file) {
    open(serveURL + '/' + flags.file)
  } else if (!flags.x) {
    open(serveURL)
  }
}


// Initialize MarkServ connect app
startConnectApp()
  .then(() => {
    if (flags.port === null) {
      return findOpenPort(PORT_RANGE.HTTP)
    }
    return flags.port
  })
  .then(setHTTPPort)
  .then(startHTTPServer)
  .then(startLiveReloadServer)
  .then(serversActivated)
  .catch (err => { console.log(err) })