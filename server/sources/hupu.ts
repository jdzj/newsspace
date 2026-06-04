interface HotItem {
  id: string
  title: string
  url: string
  mobileUrl: string
}

// 使用 Cheerio 解析（推荐）或继续用正则
export default defineSource(async () => {
  const html = await myFetch('https://m.hupu.com/hot', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
  })

  const result: HotItem[] = []

  // 方法一：推荐使用正则（简单快速，适合热榜）
  const titleRegex = /<div[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/div>/gi
  const linkRegex = /<a[^>]*href="([^"]+)"[^>]*class="[^"]*title[^"]*"[^>]*>/gi

  let titleMatch: RegExpExecArray | null
  let linkMatch: RegExpExecArray | null

  // 简单粗暴匹配标题和链接（手机端结构相对稳定）
  const titles: string[] = []
  while ((titleMatch = titleRegex.exec(html)) !== null) {
    titles.push(titleMatch[1].trim())
  }

  // 提取链接
  const links: string[] = []
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    let link = linkMatch[1]
    if (link.startsWith('/')) {
      link = 'https://m.hupu.com' + link
    }
    links.push(link)
  }

  // 合并前 N 条
  const count = Math.min(titles.length, links.length, 30)
  for (let i = 0; i < count; i++) {
    const title = titles[i]
    const url = links[i] || `https://m.hupu.com/hot`

    if (title && title.length > 5) {
      const id = url.split('/').pop()?.replace('.html', '') || `hupu-${i}`

      result.push({
        id,
        title: title.replace(/^\d+\s*/, '').trim(), // 去掉序号
        url: url.replace('m.hupu.com', 'bbs.hupu.com'), // 转 PC 版链接（可选）
        mobileUrl: url,
      })
    }
  }

  return result
})
