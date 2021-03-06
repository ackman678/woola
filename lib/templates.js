// Modify or add new template objects below for build, includes, and helpers

// TODO: helper function for linking to site vs page specific css (for including different types depending on layout, category etc)
//<link rel="stylesheet" href="${site.baseurl}/css/main.css">
//helper function for page link layout in header
// TODO: add screen/preview and reveal/slideshohw templates

// ---template build---
const templates = {
  build: {
    master: function (site, includes, layout, helpers, data) {return (
`<!DOCTYPE html>
<html>
  ${includes.head(site, helpers, data)}
  <body>
    ${includes.header(site, helpers)}
    <div class="page-content">
      <div class="wrapper">
        ${layout(site, helpers, data)}
      </div>
    </div>
    ${includes.footer(site, helpers)}
  </body>
</html>`
    )},

    simple: function (site, includes, layout, helpers, data) {return (
`<!DOCTYPE html>
<html>
  ${includes.head(site, helpers, data)}
  <body>
    <div class="page-content">
      <div class="wrapper">
        ${layout(site, helpers, data)}
      </div>
    </div>
  </body>
</html>`
    )},

    none: function (site, includes, layout, helpers, data) {return data.content}

  }
}


// ---template includes---
templates.includes = {

  head: (site, helpers, data) => {
  return (
`<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${(data.title) ? data.title : site.title}</title>
  <meta name="description" content="${helpers.pushPageDesc(site, data)}">
  <link rel="stylesheet" href="${site.cssURI}">
  <link rel="canonical" href="${(site.baseurl.length > 0 && site.baseurl !== '/' && site.baseurl !== './' && site.baseurl !== '.') ? [site.url, site.baseurl, data.url].join('/') : [site.url, data.url].join('/')}">
  <!-- <link rel="alternate" type="application/rss+xml" title="${site.title}" href="${site.url + site.baseurl}/feed.xml"> -->
</head>`
  )},

  header: (site, helpers) => {return (
`<header class="site-header">
  <div class="wrapper">
    <a class="site-title" href="${site.baseurl}/">${site.title}</a>
    <nav class="site-nav">
      <a href="#" class="menu-icon">
        <svg viewBox="0 0 18 15">
          <path fill="#424242" d="M18,1.484c0,0.82-0.665,1.484-1.484,1.484H1.484C0.665,2.969,0,2.304,0,1.484l0,0C0,0.665,0.665,0,1.484,0 h15.031C17.335,0,18,0.665,18,1.484L18,1.484z"/>
          <path fill="#424242" d="M18,7.516C18,8.335,17.335,9,16.516,9H1.484C0.665,9,0,8.335,0,7.516l0,0c0-0.82,0.665-1.484,1.484-1.484 h15.031C17.335,6.031,18,6.696,18,7.516L18,7.516z"/>
          <path fill="#424242" d="M18,13.516C18,14.335,17.335,15,16.516,15H1.484C0.665,15,0,14.335,0,13.516l0,0 c0-0.82,0.665-1.484,1.484-1.484h15.031C17.335,12.031,18,12.696,18,13.516L18,13.516z"/>
        </svg>
      </a>
      <div class="trigger">
        ${helpers.pushPageLinks(site)}
      </div>
    </nav>
  </div>
</header>`
  )},

  footer: (site, helpers) => {return (
`<footer class="site-footer">
  <div class="wrapper">
    <div class="footer-col-wrapper">
      <div class="footer-col footer-col-1">
        <ul class="contact-list">
          <li>${site.owner}</li>
          <li>${site.email}</li>
          <li>${new Date(site.time).toISOString()}</li>
        </ul>
      </div>

      <div class="footer-col footer-col-2">
        <ul class="social-media-list">
          ${helpers.pushGitHubIcon(site)}
          ${helpers.pushTwitterIcon(site)}
        </ul>
      </div>

      <div class="footer-col footer-col-3">
        <p>${site.description}</p>
      </div>
    </div>
  </div>
</footer>`
  )}

}



// ---template layouts---
templates.layouts = {

  page: (site, helpers, data) => {
    return (
`<article class="post">
  <header class="post-header">
    <h1 class="post-title">${data.title}</h1>
  </header>
  <div class="post-content">
    ${data.content}
  </div>
</article>`
  )},

  post: (site, helpers, data) => {
    return (
`<article class="post" itemscope itemtype="http://schema.org/BlogPosting">
  <header class="post-header">
    <h1 class="post-title" itemprop="name headline">${data.title}</h1>
    <p class="post-meta"><time datetime="${new Date(data.date).toISOString()}" itemprop="datePublished">${new Date(data.date).toDateString().slice(4).replace(/ ([0-9]{4})/, ', $1')}</time>${helpers.pushPageAuthors(data)}</p>
  </header>
  <div class="post-content" itemprop="articleBody">
    ${data.content}
  </div>
</article>`
  )},

  home: (site, helpers, data) => {
    let excludes = []
    const intersect = data.categories.filter((x) => { return (site.options.filterCategories.indexOf(x) !== -1) })
    if (intersect[0]) {
      site.options.filterCategories.forEach((x) => {
        if (!intersect.includes(x)) {excludes.push(x)}
      })
    } else {
      excludes = site.options.filterCategories
    }

    return (
`<div class="home">
  <!-- <h1 class="page-heading">Posts</h1> -->
  <ul class="post-list">
    ${helpers.pushPostLinks(site,excludes)}
  </ul>
  <!-- <p class="rss-subscribe">subscribe <a href="${site.url + site.baseurl}/feed.xml">via RSS</a></p> -->
</div>`
  )},

  localnav: (site, helpers, data) => {
    // TODO: implement this as a modular category nav index creation using category, collection, and layout parsing
    return (
`<div class="home">
  <!-- <h1 class="page-heading">Posts</h1> -->
  <ul class="post-list">
  <li>
  <span class="post-meta"><time datetime="${new Date(site.time).toISOString()}" itemprop="datePublished">${new Date(site.time).toDateString().slice(4).replace(/ ([0-9]{4})/, ', $1')}</time></span>
  <h2>
  ${(site.local_url && site.options.categories['local']['icon']) ? `<a class="post-link" href="${site.local_url}"><span class="coloricon">${helpers.icons[site.options.categories['local']['icon']]}</span><span>Local</span></a>` : ''}
  </h2>
  </li>
    ${helpers.pushPostLinks(site,site.options.filterCategories)}
  </ul>
  <!-- <p class="rss-subscribe">subscribe <a href="${site.url + site.baseurl}/feed.xml">via RSS</a></p> -->
</div>`
  )}  

}



// ---template helper functions---
templates.helpers = {

pushPageLinks: function (site) {
  // return html page link listing
  let ans = []
  site.pages.forEach(p => { 
    if (p.layout === 'page' || p.layout === 'localnav') {
        ans.push(`<a class="page-link" href="${(site.baseurl.length > 0 && site.baseurl !== '/' && site.baseurl !== './' && site.baseurl !== '.') ? [site.url, site.baseurl, p.url].join('/') : [site.url, p.url].join('/')}">${p.title}</a>`)
      }}) 
  return (ans.join('\n'))
},

pushPostLinks: function (site, excludes=['local','pri']) {
  // return html post link listing
  let ans = [] 
  site.pages.forEach(p => { 
    const intersect = p.categories.filter((n) => { return (excludes.indexOf(n) !== -1) })
    if (p.index && (p.layout === 'post') && !intersect[0]) {
      const ndate = new Date(p.date)
      const html = `
<li>
<span class="post-meta"><time datetime="${ndate.toISOString()}" itemprop="datePublished">${ndate.toDateString().slice(4).replace(/ ([0-9]{4})/, ', $1')}</time></span>
<h2>
<a class="post-link" href="${(site.baseurl.length > 0 && site.baseurl !== '/' && site.baseurl !== './' && site.baseurl !== '.') ? [site.url, site.baseurl, p.url].join('/') : [site.url, p.url].join('/')}">${(site.options.categories[p.categories[0]] && site.options.categories[p.categories[0]]['icon']) ? `<span class="coloricon">${this.icons[site.options.categories[p.categories[0]]['icon']]}</span>` : ''}<span>${p.title}</span></a>
</h2>
</li>`
    ans.push({date: ndate, html: html})
  }})
  // console.log(ans)
  ans.sort((a,b) => {return b.date - a.date}) //descending sort by date
  return (ans.map(item => {return item.html}).join('\n'))
},

pushPageDesc: function (site, data) {
  // return page or site description after truncating and rm newline characters
  if (data.excerpt) {
    return data.excerpt.substr(0,160).replace(/[\r\n]/g, '')
  } else {
    return site.description.substr(0,160).replace(/[\r\n]/g, '')
  }
},

pushPageAuthors: function (data) {
  // return page authors. TODO: convert to loop for in case multiple authors
  if (data.author) {
    return (
` • <span itemprop="author" itemscope itemtype="http://schema.org/Person"><span itemprop="name">${data.author}</span></span>`
    ) 
  } else {
    return ''
  }
},

pushGitHubIcon: function (site, icons) {
  // return social link and icon
  if (site.github_username) {
    return (`
        <li>
          <a href="https://github.com/${site.github_username}"><span class="icon icon--github">${this.icons.github}</span><span class="username"> ${site.github_username}</span></a>
        </li>`
    )
  } else {
    return ''
  }
},

pushTwitterIcon: function (site, icons) {
  // return social link and icon
  if (site.twitter_username) {
    return (`
        <li>
          <a href="https://twitter.com/${site.twitter_username}"><span class="icon icon--twitter">${this.icons.twitter}</span><span class="username"> ${site.twitter_username}</span></a>
        </li>`
    )
  } else {
    return ''
  }
},

icons: {
  github: `<svg viewBox="0 0 16 16"><path fill="#828282" d="M7.999,0.431c-4.285,0-7.76,3.474-7.76,7.761 c0,3.428,2.223,6.337,5.307,7.363c0.388,0.071,0.53-0.168,0.53-0.374c0-0.184-0.007-0.672-0.01-1.32 c-2.159,0.469-2.614-1.04-2.614-1.04c-0.353-0.896-0.862-1.135-0.862-1.135c-0.705-0.481,0.053-0.472,0.053-0.472 c0.779,0.055,1.189,0.8,1.189,0.8c0.692,1.186,1.816,0.843,2.258,0.645c0.071-0.502,0.271-0.843,0.493-1.037 C4.86,11.425,3.049,10.76,3.049,7.786c0-0.847,0.302-1.54,0.799-2.082C3.768,5.507,3.501,4.718,3.924,3.65 c0,0,0.652-0.209,2.134,0.796C6.677,4.273,7.34,4.187,8,4.184c0.659,0.003,1.323,0.089,1.943,0.261 c1.482-1.004,2.132-0.796,2.132-0.796c0.423,1.068,0.157,1.857,0.077,2.054c0.497,0.542,0.798,1.235,0.798,2.082 c0,2.981-1.814,3.637-3.543,3.829c0.279,0.24,0.527,0.713,0.527,1.437c0,1.037-0.01,1.874-0.01,2.129 c0,0.208,0.14,0.449,0.534,0.373c3.081-1.028,5.302-3.935,5.302-7.362C15.76,3.906,12.285,0.431,7.999,0.431z"/></svg>`,
  twitter: `<svg viewBox="0 0 16 16"><path fill="#828282" d="M15.969,3.058c-0.586,0.26-1.217,0.436-1.878,0.515c0.675-0.405,1.194-1.045,1.438-1.809c-0.632,0.375-1.332,0.647-2.076,0.793c-0.596-0.636-1.446-1.033-2.387-1.033c-1.806,0-3.27,1.464-3.27,3.27 c0,0.256,0.029,0.506,0.085,0.745C5.163,5.404,2.753,4.102,1.14,2.124C0.859,2.607,0.698,3.168,0.698,3.767 c0,1.134,0.577,2.135,1.455,2.722C1.616,6.472,1.112,6.325,0.671,6.08c0,0.014,0,0.027,0,0.041c0,1.584,1.127,2.906,2.623,3.206 C3.02,9.402,2.731,9.442,2.433,9.442c-0.211,0-0.416-0.021-0.615-0.059c0.416,1.299,1.624,2.245,3.055,2.271 c-1.119,0.877-2.529,1.4-4.061,1.4c-0.264,0-0.524-0.015-0.78-0.046c1.447,0.928,3.166,1.469,5.013,1.469 c6.015,0,9.304-4.983,9.304-9.304c0-0.142-0.003-0.283-0.009-0.423C14.976,4.29,15.531,3.714,15.969,3.058z"/></svg>`,
  bananaslug: `<svg width="24px" height="24px" viewBox="0 0 38 38" enable-background="new 0 0 38 38"> <path fill="#F1B521" d="M10,12.09c0-4,2-8,0-10s-3,2-2,2c1.414,0,2,2,1,5S10,13.09,10,12.09z"/> <path fill="#F1B521" d="M6.125,12.09c0-4,2-8,0-10s-3,2-2,2c1.414,0,2,2,1,5S6.125,13.09,6.125,12.09z"/> <path fill="#F1B521" d="M37,31.465c0,1-1,1-2,1s-18,0-23,0s-7.272-3.09-8-6c-1-4,2-11,0-12s-3-1-3-3s4.47-5.265,7-4 c4,2,2.767,6.932,2,10c-0.88,3.521,1.115,3.596,5,5c4.939,1.787,12.32,4.439,14,5C32,28.465,37,30.465,37,31.465z"/> <circle fill="#00458C" cx="4.5" cy="9.029" r="0.5"/> <circle fill="#00458C" cx="6.5" cy="10.029" r="0.5"/> </svg>`
}

}

module.exports = templates
