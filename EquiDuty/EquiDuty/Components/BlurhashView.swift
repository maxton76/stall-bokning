//
//  BlurhashView.swift
//  EquiDuty
//
//  SwiftUI view for rendering Blurhash placeholders
//

import SwiftUI
import UIKit

/// SwiftUI view that decodes and displays a Blurhash string as a placeholder image
struct BlurhashView: View {
    let blurhash: String
    let size: CGSize

    init(blurhash: String, size: CGSize = CGSize(width: 32, height: 32)) {
        self.blurhash = blurhash
        self.size = size
    }

    var body: some View {
        if let uiImage = UIImage(blurHash: blurhash, size: size) {
            Image(uiImage: uiImage)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .blur(radius: 8) // Apply blur for smooth placeholder effect
        } else {
            // Fallback if blurhash decode fails
            Color.gray.opacity(0.3)
        }
    }
}

// MARK: - UIImage Blurhash Extension

extension UIImage {
    /// Decode a Blurhash string to UIImage
    /// - Parameters:
    ///   - blurHash: The blurhash string
    ///   - size: Target size for decoded image (smaller = faster)
    /// - Returns: Decoded UIImage or nil if invalid
    convenience init?(blurHash: String, size: CGSize) {
        // Validate blurhash length (minimum 6 characters)
        guard blurHash.count >= 6 else { return nil }

        // Decode using Blurhash algorithm
        guard let image = Self.decode(blurHash: blurHash, size: size) else {
            return nil
        }

        self.init(cgImage: image)
    }

    /// Internal blurhash decoder implementation
    /// Based on https://github.com/woltapp/blurhash
    private static func decode(blurHash: String, size: CGSize) -> CGImage? {
        let sizeFlag = String(blurHash[blurHash.startIndex]).decode83()
        let numY = (sizeFlag / 9) + 1
        let numX = (sizeFlag % 9) + 1

        guard blurHash.count == 4 + 2 * numX * numY else { return nil }

        let quantisedMaximumValue = String(blurHash[blurHash.index(blurHash.startIndex, offsetBy: 1)]).decode83()
        let maximumValue = Float(quantisedMaximumValue + 1) / 166

        var colors: [(Float, Float, Float)] = []
        for i in 0..<numX * numY {
            if i == 0 {
                let value = String(blurHash[blurHash.index(blurHash.startIndex, offsetBy: 2)..<blurHash.index(blurHash.startIndex, offsetBy: 6)]).decode83()
                colors.append(decodeDC(value))
            } else {
                let value = String(blurHash[blurHash.index(blurHash.startIndex, offsetBy: 4 + i * 2)..<blurHash.index(blurHash.startIndex, offsetBy: 6 + i * 2)]).decode83()
                colors.append(decodeAC(value, maximumValue: maximumValue))
            }
        }

        let width = Int(size.width)
        let height = Int(size.height)
        let bytesPerRow = width * 4

        guard let data = CFDataCreateMutable(kCFAllocatorDefault, bytesPerRow * height) else { return nil }
        CFDataSetLength(data, bytesPerRow * height)
        guard let pixels = CFDataGetMutableBytePtr(data) else { return nil }

        for y in 0..<height {
            for x in 0..<width {
                var r: Float = 0
                var g: Float = 0
                var b: Float = 0

                for j in 0..<numY {
                    for i in 0..<numX {
                        let basis = cos(Float.pi * Float(x) * Float(i) / Float(width)) * cos(Float.pi * Float(y) * Float(j) / Float(height))
                        let color = colors[i + j * numX]
                        r += color.0 * basis
                        g += color.1 * basis
                        b += color.2 * basis
                    }
                }

                let intR = UInt8(linearTosRGB(r))
                let intG = UInt8(linearTosRGB(g))
                let intB = UInt8(linearTosRGB(b))

                let pixelIndex = (y * width + x) * 4
                pixels[pixelIndex] = intR
                pixels[pixelIndex + 1] = intG
                pixels[pixelIndex + 2] = intB
                pixels[pixelIndex + 3] = 255
            }
        }

        let bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.noneSkipLast.rawValue)

        guard let provider = CGDataProvider(data: data) else { return nil }
        guard let cgImage = CGImage(
            width: width,
            height: height,
            bitsPerComponent: 8,
            bitsPerPixel: 32,
            bytesPerRow: bytesPerRow,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: bitmapInfo,
            provider: provider,
            decode: nil,
            shouldInterpolate: true,
            intent: .defaultIntent
        ) else { return nil }

        return cgImage
    }

    private static func decodeDC(_ value: Int) -> (Float, Float, Float) {
        let r = Float(value >> 16) / 255
        let g = Float((value >> 8) & 255) / 255
        let b = Float(value & 255) / 255
        return (sRGBToLinear(r), sRGBToLinear(g), sRGBToLinear(b))
    }

    private static func decodeAC(_ value: Int, maximumValue: Float) -> (Float, Float, Float) {
        let quantR = Float(value / (19 * 19))
        let quantG = Float((value / 19) % 19)
        let quantB = Float(value % 19)

        let r = signPow((quantR - 9) / 9, 2.0) * maximumValue
        let g = signPow((quantG - 9) / 9, 2.0) * maximumValue
        let b = signPow((quantB - 9) / 9, 2.0) * maximumValue

        return (r, g, b)
    }

    private static func signPow(_ value: Float, _ exp: Float) -> Float {
        return copysign(pow(abs(value), exp), value)
    }

    private static func linearTosRGB(_ value: Float) -> Int {
        let v = max(0, min(1, value))
        if v <= 0.0031308 { return Int(v * 12.92 * 255 + 0.5) }
        else { return Int((1.055 * pow(v, 1 / 2.4) - 0.055) * 255 + 0.5) }
    }

    private static func sRGBToLinear(_ value: Float) -> Float {
        let v = max(0, min(1, value))
        if v <= 0.04045 { return v / 12.92 }
        else { return pow((v + 0.055) / 1.055, 2.4) }
    }
}

// MARK: - String Base83 Decoding

private extension String {
    func decode83() -> Int {
        var value = 0
        for character in self {
            if let digit = character.decode83() {
                value = value * 83 + digit
            }
        }
        return value
    }
}

private extension Character {
    func decode83() -> Int? {
        let characterSet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~"
        return characterSet.firstIndex(of: self)?.utf16Offset(in: characterSet)
    }
}

#Preview {
    VStack(spacing: 20) {
        // Valid blurhash examples
        BlurhashView(blurhash: "LGF5]+Yk^6#M@-5c,1J5@[or[Q6.", size: CGSize(width: 32, height: 32))
            .frame(width: 200, height: 200)
            .clipShape(RoundedRectangle(cornerRadius: 12))

        BlurhashView(blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4", size: CGSize(width: 32, height: 32))
            .frame(width: 200, height: 200)
            .clipShape(Circle())
    }
    .padding()
}
