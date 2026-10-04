package com.paymydine.mobile.hardware.customerdisplay

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Typeface
import java.text.NumberFormat
import java.util.Currency
import java.util.Locale
import kotlin.math.min

/**
 * PMD_ZCS_CUSTOMER_DISPLAY_RENDERER_V1
 *
 * ZCS' sample secondary-screen assets are 480x480. We render one complete,
 * self-contained frame and hand the resulting Bitmap to the vendor SDK.
 */
class CustomerDisplayRenderer {
    fun render(
        state: CustomerDisplayState,
        heroImage: Bitmap?,
    ): Bitmap {
        val bitmap =
            Bitmap.createBitmap(
                WIDTH,
                HEIGHT,
                Bitmap.Config.ARGB_8888,
            )
        val canvas = Canvas(bitmap)
        canvas.drawColor(BG)

        when (state.phase) {
            CustomerDisplayPhase.IDLE -> drawIdle(canvas, state)
            CustomerDisplayPhase.ORDER -> drawOrder(canvas, state, heroImage)
            CustomerDisplayPhase.PAYMENT -> drawPayment(canvas, state)
            CustomerDisplayPhase.SUCCESS -> drawSuccess(canvas, state)
            CustomerDisplayPhase.ERROR -> drawError(canvas, state)
        }

        return bitmap
    }

    private fun drawBrand(canvas: Canvas, rightLabel: String? = null) {
        text(
            canvas = canvas,
            value = "PayMyDine",
            x = 24f,
            y = 39f,
            size = 24f,
            color = INK,
            bold = true,
        )

        rightLabel?.takeIf { it.isNotBlank() }?.let {
            textRight(
                canvas = canvas,
                value = it,
                x = WIDTH - 24f,
                y = 38f,
                size = 15f,
                color = MUTED,
                bold = true,
            )
        }

        line(canvas, 24f, 56f, WIDTH - 24f, 56f, LINE)
    }

    private fun drawIdle(
        canvas: Canvas,
        state: CustomerDisplayState,
    ) {
        drawBrand(canvas)

        textCentered(
            canvas = canvas,
            value = state.headline ?: "Welcome",
            y = 210f,
            size = 42f,
            color = INK,
            bold = true,
        )
        textCentered(
            canvas = canvas,
            value = state.message ?: "Ready when you are",
            y = 255f,
            size = 20f,
            color = MUTED,
            bold = false,
        )

        roundedRect(
            canvas,
            RectF(120f, 310f, 360f, 364f),
            27f,
            ACCENT_SOFT,
        )
        textCentered(
            canvas = canvas,
            value = "Order with confidence",
            y = 344f,
            size = 17f,
            color = ACCENT,
            bold = true,
        )
    }

    private fun drawOrder(
        canvas: Canvas,
        state: CustomerDisplayState,
        heroImage: Bitmap?,
    ) {
        drawBrand(
            canvas,
            state.tableLabel ?: state.orderLabel,
        )

        val imageRect = RectF(24f, 76f, 202f, 254f)
        if (heroImage != null) {
            drawCenterCrop(canvas, heroImage, imageRect)
        } else {
            roundedRect(canvas, imageRect, 22f, ACCENT_SOFT)
            textCenteredInRect(
                canvas,
                state.highlightName?.take(1)?.uppercase() ?: "✓",
                imageRect,
                54f,
                ACCENT,
                true,
            )
        }

        text(
            canvas = canvas,
            value = "Just added",
            x = 226f,
            y = 104f,
            size = 16f,
            color = ACCENT,
            bold = true,
        )
        drawWrappedText(
            canvas = canvas,
            value = state.highlightName ?: state.items.lastOrNull()?.name ?: "Your order",
            x = 226f,
            y = 140f,
            maxWidth = 226f,
            size = 26f,
            maxLines = 3,
            color = INK,
            bold = true,
            lineHeight = 31f,
        )

        text(
            canvas = canvas,
            value = state.items.sumOf { it.quantity }.formatQuantity() + " item" +
                if (state.items.sumOf { it.quantity } == 1.0) "" else "s",
            x = 226f,
            y = 236f,
            size = 16f,
            color = MUTED,
            bold = false,
        )

        line(canvas, 24f, 276f, WIDTH - 24f, 276f, LINE)

        val visible = state.items.takeLast(3)
        var y = 306f
        visible.forEach { row ->
            text(
                canvas = canvas,
                value = row.quantity.formatQuantity() + "× " + row.name,
                x = 24f,
                y = y,
                size = 17f,
                color = INK,
                bold = true,
                maxWidth = 285f,
            )
            textRight(
                canvas = canvas,
                value = money(state.currency, row.lineTotal),
                x = WIDTH - 24f,
                y = y,
                size = 17f,
                color = INK,
                bold = true,
            )
            y += 31f
        }

        if (state.items.size > visible.size) {
            text(
                canvas = canvas,
                value = "+" + (state.items.size - visible.size) + " more",
                x = 24f,
                y = 398f,
                size = 14f,
                color = MUTED,
                bold = false,
            )
        }

        roundedRect(
            canvas,
            RectF(20f, 414f, WIDTH - 20f, HEIGHT - 18f),
            24f,
            INK,
        )
        text(
            canvas = canvas,
            value = "TOTAL",
            x = 42f,
            y = 454f,
            size = 17f,
            color = Color.WHITE,
            bold = true,
        )
        textRight(
            canvas = canvas,
            value = money(state.currency, state.total),
            x = WIDTH - 42f,
            y = 456f,
            size = 30f,
            color = Color.WHITE,
            bold = true,
        )
    }

    private fun drawPayment(
        canvas: Canvas,
        state: CustomerDisplayState,
    ) {
        drawBrand(
            canvas,
            state.tableLabel ?: state.orderLabel,
        )

        textCentered(
            canvas = canvas,
            value = "Amount to pay",
            y = 136f,
            size = 20f,
            color = MUTED,
            bold = true,
        )
        textCentered(
            canvas = canvas,
            value = money(
                state.currency,
                if (state.amountDue > 0.0) state.amountDue else state.total,
            ),
            y = 211f,
            size = 56f,
            color = INK,
            bold = true,
        )

        val wavePaint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = 6f
                strokeCap = Paint.Cap.ROUND
                color = ACCENT
            }
        val cx = 240f
        val cy = 288f
        canvas.drawArc(RectF(cx - 18f, cy - 26f, cx + 18f, cy + 26f), -55f, 110f, false, wavePaint)
        canvas.drawArc(RectF(cx - 38f, cy - 46f, cx + 38f, cy + 46f), -55f, 110f, false, wavePaint)
        canvas.drawArc(RectF(cx - 60f, cy - 68f, cx + 60f, cy + 68f), -55f, 110f, false, wavePaint)

        textCentered(
            canvas = canvas,
            value = state.headline ?: "Please pay",
            y = 372f,
            size = 25f,
            color = INK,
            bold = true,
        )
        textCentered(
            canvas = canvas,
            value = state.message ?: "Tap, insert, or follow the cashier",
            y = 408f,
            size = 16f,
            color = MUTED,
            bold = false,
        )
    }

    private fun drawSuccess(
        canvas: Canvas,
        state: CustomerDisplayState,
    ) {
        drawBrand(canvas)
        val p =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = SUCCESS_SOFT
            }
        canvas.drawCircle(240f, 205f, 82f, p)

        val check =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = SUCCESS
                style = Paint.Style.STROKE
                strokeWidth = 14f
                strokeCap = Paint.Cap.ROUND
                strokeJoin = Paint.Join.ROUND
            }
        canvas.drawLine(202f, 205f, 229f, 231f, check)
        canvas.drawLine(229f, 231f, 281f, 176f, check)

        textCentered(
            canvas,
            state.headline ?: "Paid",
            324f,
            42f,
            SUCCESS,
            true,
        )
        textCentered(
            canvas,
            state.message ?: "Thank you!",
            370f,
            22f,
            INK,
            true,
        )
        if (state.total > 0.0) {
            textCentered(
                canvas,
                money(state.currency, state.total),
                410f,
                18f,
                MUTED,
                false,
            )
        }
    }

    private fun drawError(
        canvas: Canvas,
        state: CustomerDisplayState,
    ) {
        drawBrand(canvas)
        val p =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = ERROR_SOFT
            }
        canvas.drawCircle(240f, 200f, 76f, p)
        textCentered(
            canvas,
            value = "!",
            y = 226f,
            size = 74f,
            color = ERROR,
            bold = true,
        )
        textCentered(
            canvas,
            state.headline ?: "Please try again",
            322f,
            32f,
            ERROR,
            true,
        )
        drawWrappedCenteredText(
            canvas,
            state.message ?: "The payment was not completed.",
            365f,
            392f,
            360f,
            18f,
            MUTED,
        )
    }

    private fun drawCenterCrop(
        canvas: Canvas,
        bitmap: Bitmap,
        destination: RectF,
    ) {
        val sourceAspect = bitmap.width.toFloat() / bitmap.height.toFloat()
        val destAspect = destination.width() / destination.height()
        val src = if (sourceAspect > destAspect) {
            val width = (bitmap.height * destAspect).toInt()
            val left = (bitmap.width - width) / 2
            Rect(left, 0, left + width, bitmap.height)
        } else {
            val height = (bitmap.width / destAspect).toInt()
            val top = (bitmap.height - height) / 2
            Rect(0, top, bitmap.width, top + height)
        }
        canvas.save()
        val clip = RectF(destination)
        canvas.clipRect(clip)
        canvas.drawBitmap(bitmap, src, destination, null)
        canvas.restore()
    }

    private fun roundedRect(
        canvas: Canvas,
        rect: RectF,
        radius: Float,
        color: Int,
    ) {
        canvas.drawRoundRect(
            rect,
            radius,
            radius,
            Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = color },
        )
    }

    private fun line(
        canvas: Canvas,
        x1: Float,
        y1: Float,
        x2: Float,
        y2: Float,
        color: Int,
    ) {
        canvas.drawLine(
            x1,
            y1,
            x2,
            y2,
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                this.color = color
                strokeWidth = 2f
            },
        )
    }

    private fun text(
        canvas: Canvas,
        value: String,
        x: Float,
        y: Float,
        size: Float,
        color: Int,
        bold: Boolean,
        maxWidth: Float? = null,
    ) {
        val paint = paint(size, color, bold)
        val safe =
            if (maxWidth == null) {
                value
            } else {
                ellipsize(value, paint, maxWidth)
            }
        canvas.drawText(safe, x, y, paint)
    }

    private fun textRight(
        canvas: Canvas,
        value: String,
        x: Float,
        y: Float,
        size: Float,
        color: Int,
        bold: Boolean,
    ) {
        val paint =
            paint(size, color, bold).apply {
                textAlign = Paint.Align.RIGHT
            }
        canvas.drawText(value, x, y, paint)
    }

    private fun textCentered(
        canvas: Canvas,
        value: String,
        y: Float,
        size: Float,
        color: Int,
        bold: Boolean,
    ) {
        val paint =
            paint(size, color, bold).apply {
                textAlign = Paint.Align.CENTER
            }
        canvas.drawText(value, WIDTH / 2f, y, paint)
    }

    private fun textCenteredInRect(
        canvas: Canvas,
        value: String,
        rect: RectF,
        size: Float,
        color: Int,
        bold: Boolean,
    ) {
        val paint =
            paint(size, color, bold).apply {
                textAlign = Paint.Align.CENTER
            }
        val y =
            rect.centerY() -
                (paint.descent() + paint.ascent()) / 2f
        canvas.drawText(value, rect.centerX(), y, paint)
    }

    private fun drawWrappedText(
        canvas: Canvas,
        value: String,
        x: Float,
        y: Float,
        maxWidth: Float,
        size: Float,
        maxLines: Int,
        color: Int,
        bold: Boolean,
        lineHeight: Float,
    ) {
        val paint = paint(size, color, bold)
        val words = value.split(Regex("\\s+")).filter { it.isNotBlank() }
        val lines = mutableListOf<String>()
        var current = ""

        for (word in words) {
            val candidate = if (current.isBlank()) word else "$current $word"
            if (paint.measureText(candidate) <= maxWidth) {
                current = candidate
            } else {
                if (current.isNotBlank()) lines += current
                current = word
                if (lines.size >= maxLines - 1) break
            }
        }
        if (current.isNotBlank() && lines.size < maxLines) {
            lines += current
        }

        lines.take(maxLines).forEachIndexed { index, line ->
            val safe =
                if (index == maxLines - 1 && paint.measureText(line) > maxWidth) {
                    ellipsize(line, paint, maxWidth)
                } else {
                    line
                }
            canvas.drawText(safe, x, y + index * lineHeight, paint)
        }
    }

    private fun drawWrappedCenteredText(
        canvas: Canvas,
        value: String,
        top: Float,
        bottom: Float,
        maxWidth: Float,
        size: Float,
        color: Int,
    ) {
        val paint =
            paint(size, color, false).apply {
                textAlign = Paint.Align.CENTER
            }
        val words = value.split(Regex("\\s+")).filter { it.isNotBlank() }
        val lines = mutableListOf<String>()
        var current = ""
        for (word in words) {
            val candidate = if (current.isBlank()) word else "$current $word"
            if (paint.measureText(candidate) <= maxWidth) {
                current = candidate
            } else {
                if (current.isNotBlank()) lines += current
                current = word
            }
        }
        if (current.isNotBlank()) lines += current

        val lineHeight = size * 1.32f
        val maxLines = min(3, ((bottom - top) / lineHeight).toInt().coerceAtLeast(1))
        lines.take(maxLines).forEachIndexed { index, line ->
            canvas.drawText(
                if (index == maxLines - 1) ellipsize(line, paint, maxWidth) else line,
                WIDTH / 2f,
                top + index * lineHeight,
                paint,
            )
        }
    }

    private fun paint(
        size: Float,
        color: Int,
        bold: Boolean,
    ): Paint =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textSize = size
            this.color = color
            typeface =
                if (bold) {
                    Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                } else {
                    Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
                }
        }

    private fun ellipsize(
        value: String,
        paint: Paint,
        maxWidth: Float,
    ): String {
        if (paint.measureText(value) <= maxWidth) return value
        val suffix = "…"
        var end = value.length
        while (end > 1 && paint.measureText(value.substring(0, end) + suffix) > maxWidth) {
            end -= 1
        }
        return value.substring(0, end).trimEnd() + suffix
    }

    private fun money(
        currency: String,
        value: Double,
    ): String {
        val symbol = currency.trim().ifBlank { "€" }
        return if (symbol.length <= 3 && !symbol.all { it.isLetter() }) {
            symbol + String.format(Locale.US, "%.2f", value.coerceAtLeast(0.0))
        } else {
            runCatching {
                NumberFormat.getCurrencyInstance().apply {
                    this.currency = Currency.getInstance(symbol.uppercase())
                }.format(value.coerceAtLeast(0.0))
            }.getOrElse {
                String.format(Locale.US, "%.2f %s", value.coerceAtLeast(0.0), symbol)
            }
        }
    }

    private fun Double.formatQuantity(): String {
        return if (this % 1.0 == 0.0) {
            toLong().toString()
        } else {
            String.format(Locale.US, "%.2f", this)
                .trimEnd('0')
                .trimEnd('.')
        }
    }

    companion object {
        const val WIDTH = 480
        const val HEIGHT = 480

        private val BG = Color.rgb(250, 250, 249)
        private val INK = Color.rgb(24, 24, 27)
        private val MUTED = Color.rgb(113, 113, 122)
        private val LINE = Color.rgb(228, 228, 231)
        private val ACCENT = Color.rgb(11, 109, 96)
        private val ACCENT_SOFT = Color.rgb(224, 242, 241)
        private val SUCCESS = Color.rgb(22, 163, 74)
        private val SUCCESS_SOFT = Color.rgb(220, 252, 231)
        private val ERROR = Color.rgb(220, 38, 38)
        private val ERROR_SOFT = Color.rgb(254, 226, 226)
    }
}
