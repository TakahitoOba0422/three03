// Vertex Shader
const vertexShader = `
  precision mediump float; // 中程度の精度で計算
  varying vec2 vUv; // テクスチャ座標を格納する変数

  void main() {
    vUv = uv; // テクスチャ座標をvUvに渡す
    gl_Position = vec4(position, 1.0); // 頂点の位置を決定
  }
`;

// Fragment Shader
const fragmentShader = `
      precision mediump float; // 中程度の精度で計算

      varying vec2 vUv; // テクスチャ座標
      uniform sampler2D uTexFirst; // 最初のテクスチャ
      uniform sampler2D uTexSecond; // 次のテクスチャ
      uniform sampler2D uTexMid; // 中間のテクスチャ（歪み用）
      uniform float uProgress; // アニメーションの進行度
      uniform vec2 uNoiseScale; // ノイズのスケール

      // 放物線の計算用関数
      float parabola(float x, float k) {
        return pow(4.0 * x * (1.0 - x), k);
      }

      // 疑似ランダムな数を生成する関数
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }

      // ノイズ生成用関数
      float noise(vec2 st) {
        vec2 i = floor(st); // 座標の整数部分
        vec2 f = fract(st); // 座標の小数部分

        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));

        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); // 補間してノイズを生成
      }

      void main() {
        // ノイズ値を取得し進行度に応じて調整
        float n = noise(vUv * uNoiseScale);
        n = n * 0.5 - 0.5; // ノイズを調整
        n += uProgress;
        n = step(0.0, n); // 0以上なら1、それ以外は0

        vec4 texMid = texture(uTexMid, vUv); // 中間テクスチャの色を取得
        float distortion = texMid.r; // 赤いチャンネルの値を歪みの強さとする
        distortion *= parabola(uProgress, 1.0); // アニメーションの進行度で歪みを調整

        float distortionLevel = 0.2; // 歪みの強さを決定
        vec4 texFirst = texture(uTexFirst, vUv + distortion * distortionLevel); // 歪みを適用した最初のテクスチャ
        vec4 texSecond = texture(uTexSecond, vUv + distortion * distortionLevel); // 歪みを適用した次のテクスチャ

        // 最終的な色をアニメーションの進行度でブレンド
        gl_FragColor = mix(texFirst, texSecond, uProgress);
      }
    `;

async function initializeThreeJS() {
  const scene = new THREE.Scene(); // シーンを作成
  const camera = new THREE.PerspectiveCamera(
    75, // 視野角
    window.innerWidth / window.innerHeight, // アスペクト比
    0.1, // カメラの近くの描画範囲
    1000 // カメラの遠くの描画範囲
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true }); // レンダラーの設定（アンチエイリアス有効）
  renderer.setSize(window.innerWidth, window.innerHeight); // レンダラーのサイズ設定
  renderer.setClearColor(0xffffff); // 背景色を白に設定
  document.body.appendChild(renderer.domElement); // HTMLにレンダラーを追加

  // テクスチャを非同期で読み込む関数
  async function loadTex(url) {
    const texLoader = new THREE.TextureLoader();
    return await texLoader.loadAsync(url);
  }

  const geometry = new THREE.PlaneGeometry(2, 2); // 平面ジオメトリを作成
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTexFirst: { value: await loadTex("img01.jpg") }, // 最初のテクスチャ
      uTexMid: { value: await loadTex("img_mix.jpg") }, // 中間テクスチャ
      uTexSecond: { value: await loadTex("img02.jpg") }, // 次のテクスチャ
      uProgress: { value: 0 }, // アニメーションの進行度
      uNoiseScale: { value: new THREE.Vector2(2, 2) }, // ノイズのスケール
    },
    vertexShader: vertexShader, // 頂点シェーダー
    fragmentShader: fragmentShader, // フラグメントシェーダー
  });

  const plane = new THREE.Mesh(geometry, material); // 平面メッシュを作成
  scene.add(plane); // シーンに追加

  camera.position.z = 30; // カメラの位置を設定

  // ボタンをクリックしたときのアニメーション
  document.querySelector(".js-image-flip").addEventListener("click", () => {
    gsap.to(material.uniforms.uProgress, {
      value: !Boolean(material.uniforms.uProgress.value), // アニメーションの進行度を反転
      duration: 1.3, // アニメーション時間
      ease: "Power2.inOut", // アニメーションのイージング
    });
  });

  function animate() {
    requestAnimationFrame(animate); // アニメーションフレームを呼び出す
    renderer.render(scene, camera); // シーンをレンダリング
  }

  // ウィンドウサイズ変更時にカメラとレンダラーの設定を更新
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; // カメラのアスペクト比を更新
    camera.updateProjectionMatrix(); // プロジェクションマトリクスを更新
    renderer.setSize(window.innerWidth, window.innerHeight); // レンダラーのサイズを更新
  });

  animate(); // アニメーションを開始
}

// ページの読み込み完了後にThree.jsを初期化
window.onload = initializeThreeJS;
