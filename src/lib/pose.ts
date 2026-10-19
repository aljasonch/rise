// Sudut hadap wajah dari matrix transformasi FaceLandmarker.
// Layout datanya mengikuti THREE.Matrix4 column-major: 4 kolom berisi 4 baris,
// sehingga data[3], data[7], data[11], data[15] selalu (0, 0, 0, 1) dan terjemahan
// berada di data[12..14]. Kolom ketiga matrix rotasi (data[8..10]) adalah sumbu Z
// model kanonik, yaitu arah hadap wajah di ruang kamera.
//
// Sudut dihitung relatif sumbu kamera (0, 0, 1). Tanda tidak dipakai karena
// penilaiannya memakai besaran.
export const faceAngles = (data: number[]) => ({
  yaw: (Math.atan2(data[8], data[10]) * 180) / Math.PI,
  pitch: (Math.atan2(data[9], data[10]) * 180) / Math.PI,
});
