# Google Sheets Yedekleme Kurulumu

## 1. Google Sheets Oluştur
1. https://sheets.google.com adresine git
2. "Boş Tablo" ile yeni bir tablo oluştur
3. Tablonun adını "Bugün Ne Var - Yedek" yap

## 2. Apps Script Aç
1. Tabloda üst menüden **Uzantılar > Apps Script** tıkla
2. Açılan editördeki tüm kodu sil
3. Aşağıdaki kodu yapıştır:

```javascript
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Görevler");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Görevler");
    sheet.getRange("A1").setValue("data");
    sheet.getRange("B1").setValue("son güncelleme");
  }

  var action = e.parameter.action;
  var callback = e.parameter.callback;
  var result;

  if (action === "save") {
    var data = e.parameter.data;
    sheet.getRange("A2").setValue(data);
    sheet.getRange("B2").setValue(new Date().toISOString());
    result = {status: "ok"};
  } else if (action === "load") {
    var data = sheet.getRange("A2").getValue();
    result = {status: "ok", data: data || "[]"};
  } else {
    result = {status: "error"};
  }

  if (callback) {
    return ContentService.createTextOutput(callback + "(" + JSON.stringify(result) + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3. Deploy Et
1. Sağ üstte **Deploy > New deployment** tıkla
2. Sol üstte dişli ikonu yanındaki **Select type > Web app** seç
3. Ayarlar:
   - Description: "Bugün Ne Var API"
   - Execute as: **Me**
   - Who has access: **Anyone**
4. **Deploy** tıkla
5. **Authorize access** tıkla, Google hesabını seç, izin ver
6. Sana bir **URL** verecek. Bu URL'yi kopyala.

## 4. Uygulamaya Bağla
1. Uygulamayı aç
2. Altta **⚙️ Ayarlar** butonuna bas
3. Google Sheets URL'sini yapıştır
4. Kaydet

Artık veriler otomatik olarak Google Sheets'e yedeklenecek!
