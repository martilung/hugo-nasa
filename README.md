# NASA PÄEVA KOSMOSEPILT (TRÜKITÄHTEDES)

Veebileht, mis võtab 1x päevas NASA päevapildi (APOD – *Astronomy Picture of the Day*), tõlgib selle pealkirja ning selgituse automaatselt eesti keelde ja kuvab kogu info selgetes **SUURTES TRÜKITÄHTEDES**.

## Kuidas lokaalselt käivitada

```bash
npm start
```

Seejärel ava brauseris: [http://localhost:3000](http://localhost:3000)

## Kuidas panna GitHubi ja majutada Vercelis

### 1. Pane kood GitHubi
1. Loo GitHubis uus tühi repositoorium (nt `hugo-nasa`).
2. Käivita selles kaustas:
   ```bash
   git remote add origin https://github.com/SINU-KASUTAJANIMI/hugo-nasa.git
   git branch -M main
   git push -u origin main
   ```

### 2. Majuta Vercelis
1. Mine lehele [https://vercel.com](https://vercel.com) ja logi sisse oma GitHubi kontoga.
2. Vajuta **"Add New..." -> "Project"**.
3. Vali oma `hugo-nasa` GitHubi repositoorium ja vajuta **"Import"**.
4. *(Valikuline)* Kui soovid kasutada isiklikku tasuta NASA API võtit (saad selle 30 sekundiga lehelt [https://api.nasa.gov](https://api.nasa.gov)), lisa **Environment Variables** alla:
   - `NASA_API_KEY` = `sinu_nasa_api_voti`
   *(Ilma selleta töötab leht samuti automaatselt `DEMO_KEY` ja NASA otseallika toel).*
5. Vajuta **"Deploy"** – leht on mõne sekundiga üleval!
