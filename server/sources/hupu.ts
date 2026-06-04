interface HotItem {
  id: string
  title: string
  url: string
  mobileUrl: string
}

export default defineSource(async () => {
  const xml = await myFetch('https://www.chinanews.com.cn/rss/scroll-news.xml', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)',
    }
  })

  const result: HotItem[] = []

  // 简单正则提取 RSS 中的 item（足够稳定）
  const itemRegex = /<item>[\s\S]*?<\/item>/gi
  const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>/gi
  const linkRegex = /<link>(https?:\/\/.*?)<\/link>/gi

  let itemMatch: RegExpExecArray | null

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemContent = itemMatch[0]

    const titleMatch = titleRegex.exec(itemContent)
    const linkMatch = linkRegex.exec(itemContent)

    if (titleMatch && linkMatch) {
      const title = titleMatch[1].trim()
      let url = linkMatch[1].trim()

      if (title && url) {
        const id = url.split('/').pop()?.replace('.shtml', '') || `cn-${Date.now()}`

        result.push({
          id,
          title,
          url,                    // PC 版链接
          mobileUrl: url.replace('www.chinanews.com.cn', 'm.chinanews.com'), // 移动版（可选）
        })
      }
    }

    // 重置正则 lastIndex
    titleRegex.lastIndex = 0
    linkRegex.lastIndex = 0
  }

  // 限制返回数量
  return result.slice(0, 30)
})
