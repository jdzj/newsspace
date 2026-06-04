import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"

/**
 * 网易新闻 - 综合新闻
 */
const news = defineSource(async () => {
  const baseURL = "https://news.163.com"
  const html: string = await myFetch(baseURL)
  const $ = cheerio.load(html)
  const news: NewsItem[] = []

  // 获取首页主要新闻
  $(".news_box").each((_, element) => {
    const $element = $(element)
    const $link = $element.find("a").first()
    const title = $link.attr("title") || $link.text()
    const url = $link.attr("href")

    if (title && url) {
      news.push({
        id: url,
        title: title.trim(),
        url: url.includes("http") ? url : `${baseURL}${url}`,
      })
    }
  })

  // 如果通过选择器没有获取到足够的新闻，尝试备用选择器
  if (news.length < 10) {
    $(".news_txt").each((_, element) => {
      const $element = $(element)
      const $link = $element.find("a").first()
      const title = $link.text()
      const url = $link.attr("href")

      if (title && url && !news.some(item => item.url === url)) {
        news.push({
          id: url,
          title: title.trim(),
          url: url.includes("http") ? url : `${baseURL}${url}`,
        })
      }
    })
  }

  return news.slice(0, 30)
})

/**
 * 网易新闻 - 每日轻松一刻
 */
const relaxing = defineSource(async () => {
  const baseURL = "https://news.163.com"
  const url = `${baseURL}/special/0038O8EV/news_ent_bbs.html`

  try {
    const html: string = await myFetch(url)
    const $ = cheerio.load(html)
    const news: NewsItem[] = []

    // 获取娱乐版块的新闻
    $(".post_item, .news-box").each((_, element) => {
      const $element = $(element)
      const $link = $element.find("a").first()
      const title = $link.attr("title") || $link.text()
      const href = $link.attr("href")

      if (title && href) {
        const fullUrl = href.includes("http") ? href : `${baseURL}${href}`
        if (!news.some(item => item.url === fullUrl)) {
          news.push({
            id: fullUrl,
            title: title.trim(),
            url: fullUrl,
          })
        }
      }
    })

    return news.slice(0, 30)
  } catch {
    // 如果专栏页面获取失败，使用备用方案通过API
    try {
      const apiUrl = "https://c.m.163.com/uc/api/feed"
      const response: any = await myFetch(apiUrl, {
        query: {
          version: 10,
          spjson: 1,
          channel: "ent",
          pagesize: 30,
          pageno: 1,
        },
      })

      if (response?.items?.length) {
        return response.items.map((item: any) => ({
          id: item.docurl || item.title,
          title: item.title,
          url: item.docurl || `${baseURL}/ent/`,
          extra: {
            date: item.time ? new Date(item.time * 1000).getTime() : undefined,
          },
        }))
      }
    } catch {
      // 再次失败则返回空数组
    }

    return []
  }
})

/**
 * 网易新闻 - 体育新闻
 */
const sports = defineSource(async () => {
  const baseURL = "https://sports.163.com"

  try {
    const html: string = await myFetch(baseURL)
    const $ = cheerio.load(html)
    const news: NewsItem[] = []

    // 获取首页体育新闻
    $(".news_item, .sports_news, .list_item").each((_, element) => {
      const $element = $(element)
      const $link = $element.find("a").first()
      const title = $link.attr("title") || $link.text()
      const url = $link.attr("href")

      if (title && url) {
        const fullUrl = url.includes("http") ? url : `${baseURL}${url}`
        if (!news.some(item => item.url === fullUrl)) {
          news.push({
            id: fullUrl,
            title: title.trim(),
            url: fullUrl,
          })
        }
      }
    })

    if (news.length > 0) {
      return news.slice(0, 30)
    }
  } catch {
    // 如果直接爬取失败，使用备用方案
  }

  // 备用方案：使用API获取体育新闻
  try {
    const apiUrl = "https://c.m.163.com/uc/api/feed"
    const response: any = await myFetch(apiUrl, {
      query: {
        version: 10,
        spjson: 1,
        channel: "sports",
        pagesize: 30,
        pageno: 1,
      },
    })

    if (response?.items?.length) {
      return response.items.map((item: any) => ({
        id: item.docurl || item.title,
        title: item.title,
        url: item.docurl || `${baseURL}/`,
        extra: {
          date: item.time ? new Date(item.time * 1000).getTime() : undefined,
        },
      }))
    }
  } catch {
    // API失败
  }

  return []
})

export default defineSource({
  "netease": news,
  "netease-news": news,
  "netease-relaxing": relaxing,
  "netease-sports": sports,
})
