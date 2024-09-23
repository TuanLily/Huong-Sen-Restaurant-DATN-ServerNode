const express = require('express');
const router = express.Router();
const connection = require('../../index');

// Lấy tất cả đặt bàn
router.get('/', (req, res) => {
    const { searchName = '', searchPhone = '', searchEmail = '', status = '', page = 1, pageSize = 10 } = req.query;

    // Đảm bảo page và pageSize là số nguyên
    const pageNumber = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 10;
    const offset = (pageNumber - 1) * size;

    // SQL truy vấn để lấy tổng số bản ghi
    const sqlCount = 'SELECT COUNT(*) as total FROM reservations WHERE fullname LIKE ? AND tel LIKE ? AND email LIKE ? AND status LIKE ?';

    // SQL truy vấn để lấy danh sách reservations phân trang
    // let sql = 'SELECT * FROM reservations WHERE fullname LIKE ? AND tel LIKE ? AND email LIKE ? AND status LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?';
    let sql = `
        SELECT r.*, t.number AS tableName 
        FROM reservations r
        LEFT JOIN tables t ON r.table_id = t.id
        WHERE r.fullname LIKE ? 
        AND r.tel LIKE ? 
        AND r.email LIKE ? 
        AND r.status LIKE ? 
        ORDER BY r.id DESC 
        LIMIT ? OFFSET ?
    `;

    // Đếm tổng số bản ghi khớp với tìm kiếm
    connection.query(sqlCount, [`%${searchName}%`, `%${searchPhone}%`, `%${searchEmail}%`, `%${status}%`], (err, countResults) => {
        if (err) {
            console.error('Error counting reservations:', err);
            return res.status(500).json({ error: 'Failed to count reservations' });
        }

        const totalCount = countResults[0].total;
        const totalPages = Math.ceil(totalCount / size); // Tính tổng số trang

        // Lấy danh sách reservations cho trang hiện tại
        connection.query(sql, [`%${searchName}%`, `%${searchPhone}%`, `%${searchEmail}%`, `%${status}%`, size, offset], (err, results) => {
            if (err) {
                console.error('Error fetching reservations:', err);
                return res.status(500).json({ error: 'Failed to fetch reservations' });
            }

            // Trả về kết quả với thông tin phân trang
            res.status(200).json({
                message: 'Show list reservations successfully',
                results,
                totalCount,
                totalPages,
                currentPage: pageNumber
            });
        });
    });
});

// Lấy đặt bàn theo id
router.get('/:id', (req, res) => {
    const { id } = req.params;

    // SQL truy vấn để lấy thông tin đặt bàn theo ID
    const sql = `
        SELECT r.*, t.number AS tableName, p.discount AS discount 
        FROM reservations r
        LEFT JOIN tables t ON r.table_id = t.id
        LEFT JOIN promotions p ON r.promotion_id = p.id
        WHERE r.id = ?
    `;

    // Thực hiện truy vấn
    connection.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Error fetching reservation by ID:', err);
            return res.status(500).json({ error: 'Failed to fetch reservation' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        const pageNumber = 1;
        const totalCount = 1;
        const totalPages = 1;

        // Trả về kết quả
        res.status(200).json({
            message: 'Show list reservations successfully',
            results,
            totalCount,
            totalPages,
            currentPage: pageNumber
        });
    });
});


// Lấy tất cả chi tiết đặt bàn theo reservation_id 
router.get('/reservation_details/:reservation_id', (req, res) => {
    const { reservation_id } = req.params;

    // SQL truy vấn để lấy danh sách reservations kèm theo thông tin sản phẩm
    let sql = `
        SELECT rd.*, p.name AS product_name, p.image AS product_image
        FROM reservation_details rd
        JOIN products p ON rd.product_id = p.id
        WHERE rd.reservation_id = ?
    `;

    // Lấy danh sách 
    connection.query(sql, [reservation_id], (err, results) => {
        if (err) {
            console.error('Error fetching reservation_details:', err);
            return res.status(500).json({ error: 'Failed to fetch reservation_details' });
        }

        // Trả về kết quả với thông tin phân trang
        res.status(200).json({
            message: 'Show list reservation_details successfully',
            results,
        });
    });
});


// *Cập nhật trạng thái theo id bằng phương thức patch
router.patch('/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const sql = 'UPDATE reservations SET ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    connection.query(sql, [updates, id], (err, results) => {
        if (err) {
            console.error('Error partially updating reservations:', err);
            return res.status(500).json({ error: 'Failed to partially update reservations' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Reservations not found' });
        }
        res.status(200).json({ message: "Reservations update successfully" });
    });
});

// *Xóa reservations theo id
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    // Bước 1: Xóa tất cả các chi tiết đặt bàn có reservation_id trùng với id
    const deleteDetailsSql = 'DELETE FROM reservation_details WHERE reservation_id = ?';

    connection.query(deleteDetailsSql, [id], (err) => {
        if (err) {
            console.error('Error deleting reservation details:', err);
            return res.status(500).json({ error: 'Failed to delete reservation details' });
        }

        // Bước 2: Xóa bản ghi trong bảng reservations
        const deleteReservationSql = 'DELETE FROM reservations WHERE id = ?';
        
        connection.query(deleteReservationSql, [id], (err, results) => {
            if (err) {
                console.error('Error deleting reservations:', err);
                return res.status(500).json({ error: 'Failed to delete reservations' });
            }
            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Reservations not found' });
            }
            res.status(200).json({ message: 'Reservations and related details deleted successfully' });
        });
    });
});

module.exports = router;