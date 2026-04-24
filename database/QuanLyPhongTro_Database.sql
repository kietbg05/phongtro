-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: QuanLyPhongTro
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `dichvu`
--

DROP TABLE IF EXISTS `dichvu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dichvu` (
  `idDichVu` int(11) NOT NULL AUTO_INCREMENT,
  `TenDichVu` varchar(100) NOT NULL,
  `Gia` decimal(15,2) DEFAULT NULL,
  `DonViTinh` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`idDichVu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dichvu`
--

LOCK TABLES `dichvu` WRITE;
/*!40000 ALTER TABLE `dichvu` DISABLE KEYS */;
/*!40000 ALTER TABLE `dichvu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hoadon`
--

DROP TABLE IF EXISTS `hoadon`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hoadon` (
  `idHoaDon` int(11) NOT NULL AUTO_INCREMENT,
  `idHopDong` int(11) DEFAULT NULL,
  `ngayLap` date DEFAULT NULL,
  `tongTien` decimal(15,2) DEFAULT 0.00,
  `trangThai` varchar(20) DEFAULT 'ChuaThanhToan',
  `dienCu` int(11) DEFAULT 0,
  `dienMoi` int(11) DEFAULT 0,
  `giaDien` int(11) DEFAULT 3500,
  `nuocCu` int(11) DEFAULT 0,
  `nuocMoi` int(11) DEFAULT 0,
  `giaNuoc` int(11) DEFAULT 15000,
  PRIMARY KEY (`idHoaDon`),
  KEY `idHopDong` (`idHopDong`),
  CONSTRAINT `hoadon_ibfk_1` FOREIGN KEY (`idHopDong`) REFERENCES `hopdong` (`idHopDong`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hoadon`
--

LOCK TABLES `hoadon` WRITE;
/*!40000 ALTER TABLE `hoadon` DISABLE KEYS */;
INSERT INTO `hoadon` VALUES (6,10,'2026-04-15',3820000.00,'Đã thanh toán',356,376,3500,356,376,15000);
/*!40000 ALTER TABLE `hoadon` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hoadondichvu`
--

DROP TABLE IF EXISTS `hoadondichvu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hoadondichvu` (
  `idHoaDonDichVu` int(11) NOT NULL AUTO_INCREMENT,
  `idHoaDon` int(11) DEFAULT NULL,
  `idDichVu` int(11) DEFAULT NULL,
  `soLuong` int(11) DEFAULT 1,
  `thanhTien` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`idHoaDonDichVu`),
  KEY `idHoaDon` (`idHoaDon`),
  KEY `idDichVu` (`idDichVu`),
  CONSTRAINT `hoadondichvu_ibfk_1` FOREIGN KEY (`idHoaDon`) REFERENCES `hoadon` (`idHoaDon`) ON DELETE CASCADE,
  CONSTRAINT `hoadondichvu_ibfk_2` FOREIGN KEY (`idDichVu`) REFERENCES `dichvu` (`idDichVu`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hoadondichvu`
--

LOCK TABLES `hoadondichvu` WRITE;
/*!40000 ALTER TABLE `hoadondichvu` DISABLE KEYS */;
/*!40000 ALTER TABLE `hoadondichvu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hopdong`
--

DROP TABLE IF EXISTS `hopdong`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hopdong` (
  `idHopDong` int(11) NOT NULL AUTO_INCREMENT,
  `idNguoiThue` int(11) DEFAULT NULL,
  `idPhong` int(11) DEFAULT NULL,
  `ngayKy` date DEFAULT NULL,
  `ngayHetHan` date DEFAULT NULL,
  PRIMARY KEY (`idHopDong`),
  KEY `idNguoiThue` (`idNguoiThue`),
  KEY `idPhong` (`idPhong`),
  CONSTRAINT `hopdong_ibfk_1` FOREIGN KEY (`idNguoiThue`) REFERENCES `nguoithue` (`idNguoiThue`) ON DELETE CASCADE,
  CONSTRAINT `hopdong_ibfk_2` FOREIGN KEY (`idPhong`) REFERENCES `phong` (`idPhong`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hopdong`
--

LOCK TABLES `hopdong` WRITE;
/*!40000 ALTER TABLE `hopdong` DISABLE KEYS */;
INSERT INTO `hopdong` VALUES (10,9,8,'2026-04-16','2027-04-16'),(11,10,9,'2026-04-16','2026-04-25');
/*!40000 ALTER TABLE `hopdong` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `khutro`
--

DROP TABLE IF EXISTS `khutro`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `khutro` (
  `idKhuTro` int(11) NOT NULL AUTO_INCREMENT,
  `TenKhuTro` varchar(100) NOT NULL,
  `DiaChi` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`idKhuTro`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `khutro`
--

LOCK TABLES `khutro` WRITE;
/*!40000 ALTER TABLE `khutro` DISABLE KEYS */;
INSERT INTO `khutro` VALUES (1,'Làng Đại học','678, Võ Nguyên Giáp'),(4,'Vinhomes','369 Nguyễn Xiển');
/*!40000 ALTER TABLE `khutro` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nguoithue`
--

DROP TABLE IF EXISTS `nguoithue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nguoithue` (
  `idNguoiThue` int(11) NOT NULL AUTO_INCREMENT,
  `idTaiKhoan` int(11) DEFAULT NULL,
  `HoTen` varchar(100) NOT NULL,
  `Email` varchar(100) DEFAULT NULL,
  `SoDT` varchar(15) DEFAULT NULL,
  `CCCD` varchar(20) DEFAULT NULL,
  `GioiTinh` enum('Nam','Nữ','Khác') DEFAULT 'Nam',
  `QueQuan` varchar(255) DEFAULT NULL,
  `QuocTich` varchar(100) DEFAULT 'Việt Nam',
  PRIMARY KEY (`idNguoiThue`),
  UNIQUE KEY `idTaiKhoan` (`idTaiKhoan`),
  CONSTRAINT `nguoithue_ibfk_1` FOREIGN KEY (`idTaiKhoan`) REFERENCES `taikhoan` (`idTaiKhoan`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nguoithue`
--

LOCK TABLES `nguoithue` WRITE;
/*!40000 ALTER TABLE `nguoithue` DISABLE KEYS */;
INSERT INTO `nguoithue` VALUES (9,33,'Nguyễn Văn Cu','NguyenCu@gmail.com','0985674428','012345678912','Nam','TP. Hồ Chí Minh','Việt Nam'),(10,34,'Nguyễn Bá','NguyenBa@gmail.com','0617451764','012345678912','Nam','Hà Nội','Việt Nam'),(11,35,'Nguyễn Văn A','NguyenA@gmail.com','046565476','123456546728','Nam','Đà Nẵng','Việt Nam');
/*!40000 ALTER TABLE `nguoithue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phong`
--

DROP TABLE IF EXISTS `phong`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `phong` (
  `idPhong` int(11) NOT NULL AUTO_INCREMENT,
  `SoPhong` varchar(20) NOT NULL,
  `idKhuTro` int(11) DEFAULT NULL,
  `loaiPhong` varchar(50) DEFAULT NULL,
  `dienTich` float DEFAULT NULL,
  `giaThue` decimal(15,2) DEFAULT NULL,
  `noiThat` text DEFAULT NULL,
  PRIMARY KEY (`idPhong`),
  KEY `idKhuTro` (`idKhuTro`),
  CONSTRAINT `phong_ibfk_1` FOREIGN KEY (`idKhuTro`) REFERENCES `khutro` (`idKhuTro`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phong`
--

LOCK TABLES `phong` WRITE;
/*!40000 ALTER TABLE `phong` DISABLE KEYS */;
INSERT INTO `phong` VALUES (6,'P101',1,'có gác',35,3000000.00,'Tủ đồ\n'),(7,'P101',4,'Studio',50,6500000.00,'Máy lạnh, máy giặc, bếp'),(8,'P102',1,'Loại thường, không nội thất',35,3450000.00,'Không NT'),(9,'P103',4,'NT Cơ bản',39,5600000.00,'Giường, tủ');
/*!40000 ALTER TABLE `phong` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `taikhoan`
--

DROP TABLE IF EXISTS `taikhoan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `taikhoan` (
  `idTaiKhoan` int(11) NOT NULL AUTO_INCREMENT,
  `TenDangNhap` varchar(50) NOT NULL,
  `MatKhau` varchar(255) NOT NULL,
  `Quyen` varchar(20) DEFAULT 'NguoiThue',
  PRIMARY KEY (`idTaiKhoan`),
  UNIQUE KEY `TenDangNhap` (`TenDangNhap`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `taikhoan`
--

LOCK TABLES `taikhoan` WRITE;
/*!40000 ALTER TABLE `taikhoan` DISABLE KEYS */;
INSERT INTO `taikhoan` VALUES (1,'admin','123456','Admin'),(2,'0172874833','123','NguoiThue'),(3,'122441241','123','NguoiThue'),(4,'123','123','NguoiThue'),(5,'aaaa','123','NguoiThue'),(6,'01234567675','123','NguoiThue'),(22,'sadsad','123','NguoiThue'),(23,'0946737846','123','NguoiThue'),(24,'dsasda','123','NguoiThue'),(33,'0985674428','123','NguoiThue'),(34,'0617451764','123','NguoiThue'),(35,'046565476','123','NguoiThue');
/*!40000 ALTER TABLE `taikhoan` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-16 11:48:10
