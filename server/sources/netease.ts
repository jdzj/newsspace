import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"
import { defineSource } from "#/utils/source"
import { myFetch } from "#/utils/fetch"

/**
 * 网易新闻 - 今日关注 / 头条新闻（推荐）
 */
const neteaseNews = defineSource(async () => {
  const newsItems: NewsItem[] = []
  const baseURL = "https://news.163.com"

  try {
    // 推荐 RSS 源：今日关注 / 头条（最稳定）
    const rssUrl = "http://news.163.com/special/00011K6L/rss_newstop.xml"

    const xml = await myFetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewsAggregator/1.0)",
      },
    })

    const $ = cheerio.load(xml, { xmlMode: true })

    $("item").each((_, element) => {
      const $item = $(element)
      const title = $item.find("title").text().trim()
      let link = $item.find("link").text().trim()
      const pubDate = $item.find("pubDate").text().trim()

      if (title && link) {
        // 确保链接是完整的
        if (!link.startsWith("http")) {
          link = `https://news.163.com${link}`
        }

        newsItems.push({
          id: link,
          title: title.substring(0, 200),
          url: link,
          extra: {
            date: pubDate ? new Date(pubDate).getTime() : undefined,
          },
        })
      }
    })

    if (newsItems.length > 5) {
      return newsItems.slice(0, 30)
    }
  } catch (rssError) {
    console.warn("Netease RSS fetch failed, trying fallback...", rssError)
  }

  // 备用方案：直接抓取网页热榜（手机端更稳定）
  try {
    const html = await myFetch("https://m.news.163.com/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      },
    })

    const $ = cheerio.load(html)

    // 网易移动端常见标题选择器
    $("a[href*='/news/'], .title, .list-item h3").each((_, el) => {
      const $el = $(el)
      const title = $el.text().trim()
      let url = $el.attr("href") || $el.closest("a").attr("href")

      if (title.length > 10 && url) {
        if (!url.startsWith("http")) url = "https://news.163.com" + (url.startsWith("/") ? "" : "/") + url

        if (!newsItems.some(item => item.url === url)) {
          newsItems.push({
            id: url,
            title: title.substring(0, 200),
            url,
          })
        }
      }
    })
  } catch (webError) {
    console.error("Netease web fallback failed:", webError)
  }

  return newsItems.slice(0, 30)
})

export default defineSource({
  netease: neteaseNews,
  "netease-news": neteaseNews,
  "netease-top": neteaseNews,
})
