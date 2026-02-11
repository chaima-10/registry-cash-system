import React from 'react';

const Receipt = ({ sale }) => {
    if (!sale) return null;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    return (
        <div className="receipt-container" id="receipt-print">
            <div className="receipt-content">
                {/* Header */}
                <div className="receipt-header">
                    <h1 className="store-name">Registry Cash System</h1>
                    <div className="receipt-divider">================================</div>
                </div>

                {/* Date & Time */}
                <div className="receipt-info">
                    <p>{formatDate(sale.createdAt)}</p>
                    <p>{formatTime(sale.createdAt)}</p>
                    <p>Receipt #{sale.id}</p>
                </div>

                <div className="receipt-divider">================================</div>

                {/* Items */}
                <div className="receipt-items">
                    {sale.items.map((item, index) => (
                        <div key={index} className="receipt-item">
                            <div className="item-row">
                                <span className="item-name">{item.product.name}</span>
                            </div>
                            <div className="item-row details">
                                <span className="item-details">
                                    {item.quantity} x ${Number(item.price).toFixed(2)}
                                </span>
                                <span className="item-total">
                                    ${Number(item.subtotal).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="receipt-divider">================================</div>

                {/* Total */}
                <div className="receipt-total">
                    <div className="total-row">
                        <span className="total-label">TOTAL:</span>
                        <span className="total-amount">${Number(sale.totalAmount).toFixed(2)}</span>
                    </div>
                    <div className="payment-method">
                        <span>Payment: {sale.paymentMethod}</span>
                    </div>
                </div>

                <div className="receipt-divider">================================</div>

                {/* Footer */}
                <div className="receipt-footer">
                    <p>Thank you for your purchase!</p>
                    <p>Please come again</p>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx>{`
                .receipt-container {
                    display: none;
                }

                @media print {
                    /* Hide everything except receipt */
                    body * {
                        visibility: hidden;
                    }

                    .receipt-container,
                    .receipt-container * {
                        visibility: visible;
                    }

                    .receipt-container {
                        display: block;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }

                    .receipt-content {
                        width: 80mm;
                        max-width: 80mm;
                        margin: 0 auto;
                        padding: 10mm;
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 12pt;
                        line-height: 1.4;
                        color: #000;
                        background: white;
                    }

                    .receipt-header {
                        text-align: center;
                        margin-bottom: 10px;
                    }

                    .store-name {
                        font-size: 16pt;
                        font-weight: bold;
                        margin: 0 0 5px 0;
                    }

                    .receipt-divider {
                        margin: 8px 0;
                        font-size: 10pt;
                    }

                    .receipt-info {
                        text-align: center;
                        margin-bottom: 10px;
                        font-size: 11pt;
                    }

                    .receipt-info p {
                        margin: 2px 0;
                    }

                    .receipt-items {
                        margin: 10px 0;
                    }

                    .receipt-item {
                        margin-bottom: 8px;
                    }

                    .item-row {
                        display: flex;
                        justify-content: space-between;
                        margin: 2px 0;
                    }

                    .item-name {
                        font-weight: bold;
                    }

                    .item-details {
                        font-size: 10pt;
                    }

                    .item-total {
                        font-weight: bold;
                    }

                    .receipt-total {
                        margin-top: 10px;
                    }

                    .total-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: 14pt;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }

                    .payment-method {
                        text-align: center;
                        font-size: 11pt;
                        margin-top: 5px;
                    }

                    .receipt-footer {
                        text-align: center;
                        margin-top: 10px;
                        font-size: 11pt;
                    }

                    .receipt-footer p {
                        margin: 3px 0;
                    }

                    /* Force page break settings */
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default Receipt;
