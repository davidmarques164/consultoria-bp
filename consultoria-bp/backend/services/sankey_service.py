from playwright.async_api import async_playwright


async def capturar_sankey(codigo_sankey: str) -> bytes:
    """
    Abre sankeymatic.com, cola o código, captura screenshot do diagrama.
    Retorna bytes da imagem PNG.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1200, 'height': 800})

        await page.goto('https://sankeymatic.com/build/', wait_until='networkidle')

        # Limpar área de input e inserir código
        await page.click('#input_c')
        await page.keyboard.press('Control+a')
        await page.keyboard.type(codigo_sankey)

        # Clicar em Preview/Apply
        await page.click('button[type="submit"], #process_btn, .preview-btn')
        await page.wait_for_timeout(2000)

        # Capturar apenas o diagrama SVG/Canvas
        element = await page.query_selector('#the-diagram, #sankey_svg, svg')
        if element:
            screenshot = await element.screenshot(type='png')
        else:
            screenshot = await page.screenshot(type='png', full_page=False)

        await browser.close()
        return screenshot
