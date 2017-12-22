var client_id     = "297019488331-u7bl7vmlhi2sfjgkt1ahl35f0fk4utlo.apps.googleusercontent.com";
var client_secret = "3u6Ty1EpXEnko9ytaza8HC75";

var access_token  = localStorage["access_token"];
var refresh_token = localStorage["refresh_token"];

if (access_token && refresh_token) {
  load_data();
} else {
  start_authorization();
}

// POSTする際にObjectをクエリー化するだけ
function paramsToQueryString(params) {
  var queryStrings = [];
  for (var key in params) {
    var value = params[key];
    queryStrings.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
  }

  return queryStrings.join('&');
}

// トークンの有効期限が切れてる場合に新しいアクセストークンを発行してもらう
function refresh_access_token() {
  var params = {
    "client_id": client_id,
    "client_secret": client_secret,
    "grant_type": "refresh_token",
    "refresh_token": refresh_token
  };

  return fetch("https://www.googleapis.com/oauth2/v3/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: paramsToQueryString(params)
  }).then(function(res) {
    if (res.status != 200) {
      throw new Error("failed token refresh");
    }

    return res.json();
  }).then(function(data) {
    // 注意として取得したレスポンスにはrefresh_tokenは無いのでそれも保管しちゃいけない(undefinedになるので)
    access_token = localStorage["access_token"] = data.access_token;
  });
}

// 現在取得されているアクセストークンが有効化どうかをチェックする
//現在有効では無い場合はInvalid tokenエラーになるのでエラーになったらrefresh_access_tokenをコールする
function check_token() {
  return fetch("https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + access_token).then(function(res) {
    if (res.status != 200) {
      throw new Error("invalid token");
    }

    return res.json();
  }).catch(function(error) {
    return refresh_access_token();
  });
}

function load_data() {
  var fn = function() {
    // OAuthでプロテクトされている所は自前のを使う。
    // でリクエストする際に「Authorization Bearer トークン」を付与する
    fetch("https://oauth-demo-example.appspot.com/protected/resources", {
      headers: {
        "Authorization": "Bearer " + access_token
      }
    }).then(function(res) {
      return res.json();
    }).then(function(data) {
        console.log(data);
    });
  };

  // トークンをチェックしてからAPIをコールする
  check_token().then(function(json) {
    fn();
  });
}

function start_authorization() {
  var url = "https://accounts.google.com/o/oauth2/auth?client_id=" + client_id + "&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code&scope=https://www.googleapis.com/auth/userinfo.email";

  chrome.identity.launchWebAuthFlow(
    { url: url, interactive: true },
    function() {
      // ログイン許可を出すと画面に認証コードが出るのでそれを入力させる
      var code = prompt("please input authorization code");

      var params = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": "urn:ietf:wg:oauth:2.0:oob"
      };

      // 入力した認証コードを使用してアクセストークンを取得
      fetch("https://www.googleapis.com/oauth2/v3/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: paramsToQueryString(params)
      }).then(function(res) {
        if (res.status != 200) {
          throw new Error("failed retrieve oauth token");
        }

        return res.json();
      }).then(function(data) {
        access_token  = localStorage["access_token"]  = data.access_token;
        refresh_token = localStorage["refresh_token"] = data.refresh_token;
        load_data();
      }).catch(function(error) {
        alert(error);
      });

      return true;
    }
  );
}