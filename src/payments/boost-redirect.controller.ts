import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';

function renderRedirectPage(deepLink: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Redirection vers piece-rare.ci</title>
<meta http-equiv="refresh" content="0;url=${deepLink}">
<style>
  body { font-family: system-ui, sans-serif; text-align: center; padding: 3rem 1.5rem; color: #0f172a; }
  a { display: inline-block; margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: #0f172a; color: #fff; text-decoration: none; border-radius: 0.5rem; }
</style>
</head>
<body>
  <p>Redirection vers l'application piece-rare.ci...</p>
  <a href="${deepLink}">Ouvrir l'application</a>
  <script>window.location.href = ${JSON.stringify(deepLink)};</script>
</body>
</html>`;
}

@Controller('boost')
export class BoostRedirectController {
  @Get('success')
  success(@Query() query: Record<string, string>, @Res() res: Response) {
    const qs = new URLSearchParams(query).toString();
    const deepLink = `piecerare://boost/success${qs ? `?${qs}` : ''}`;
    res.type('html').send(renderRedirectPage(deepLink));
  }

  @Get('error')
  error(@Query() query: Record<string, string>, @Res() res: Response) {
    const qs = new URLSearchParams(query).toString();
    const deepLink = `piecerare://boost/error${qs ? `?${qs}` : ''}`;
    res.type('html').send(renderRedirectPage(deepLink));
  }
}
